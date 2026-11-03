package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"
)

const githubAPI = "https://api.github.com"

// repo is the part of a GitHub repository this tool needs.
type repo struct {
	FullName   string `json:"full_name"`
	Name       string `json:"name"`
	Private    bool   `json:"private"`
	Visibility string `json:"visibility"`
}

// visibilityOf returns public, private or internal. It prefers the visibility
// field and falls back to the private flag.
func visibilityOf(r repo) string {
	switch r.Visibility {
	case "public", "private", "internal":
		return r.Visibility
	}
	if r.Private {
		return "private"
	}
	return "public"
}

// shortName returns the repo name without the owner.
func shortName(r repo) string {
	if r.Name != "" {
		return r.Name
	}
	_, name, _ := strings.Cut(r.FullName, "/")
	return name
}

// ambiguousShortNames returns short names used by more than one repo.
func ambiguousShortNames(repos []repo) map[string]bool {
	seen := map[string]int{}
	for _, r := range repos {
		seen[shortName(r)]++
	}
	out := map[string]bool{}
	for n, c := range seen {
		if c > 1 {
			out[n] = true
		}
	}
	return out
}

var nextLink = regexp.MustCompile(`<([^>]+)>;\s*rel="next"`)

// fetchRepos lists the repos the token's user owns. The token is only sent in
// the Authorization header and never printed. Pagination links must stay on
// the API host so the token cannot be sent elsewhere.
func fetchRepos(ctx context.Context, base, token string) ([]repo, error) {
	baseURL, err := url.Parse(base)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 30 * time.Second}
	next := base + "/user/repos?affiliation=owner&per_page=100"
	var all []repo
	for page := 0; next != ""; page++ {
		if page > 100 {
			return nil, fmt.Errorf("too many pages from GitHub")
		}
		u, err := url.Parse(next)
		if err != nil || u.Host != baseURL.Host || u.Scheme != baseURL.Scheme {
			return nil, fmt.Errorf("unexpected pagination link from GitHub")
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, next, http.NoBody)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("github request failed: %w", err)
		}
		var batch []repo
		decodeErr := error(nil)
		if resp.StatusCode == http.StatusOK {
			decodeErr = json.NewDecoder(io.LimitReader(resp.Body, 32<<20)).Decode(&batch)
		}
		if cerr := resp.Body.Close(); cerr != nil {
			log.Printf("close response body: %v", cerr)
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("github returned %s", resp.Status)
		}
		if decodeErr != nil {
			return nil, fmt.Errorf("decode github response: %w", decodeErr)
		}
		all = append(all, batch...)
		next = ""
		if m := nextLink.FindStringSubmatch(resp.Header.Get("Link")); m != nil {
			next = m[1]
		}
	}
	return all, nil
}

// updateEventsSQL sets is_private on GitHub events of one repo. $1 is the full
// name, $2 the new flag, $3 the short name (empty disables short-name matching).
// A row without full_name matches by short name only when its repository_url,
// points at the same repo. A row with no repository_url (issue and release rows)
// can only be made private this way, never public, because a same-named repo in
// another account could be the real source.
const updateEventsSQL = `
UPDATE events SET is_private = $2
WHERE event_type LIKE 'github.%'
AND is_private IS DISTINCT FROM $2
AND (
	metadata->>'full_name' = $1
	OR (
		$3 <> ''
		AND COALESCE(metadata->>'full_name', '') = ''
		AND metadata->>'repo' = $3
		AND (
			lower(metadata->>'repository_url') = lower('https://github.com/' || $1)
			OR ($2 AND COALESCE(metadata->>'repository_url', '') = '')
		)
	)
)`

// syncRepos upserts repo_settings and updates is_private on existing events.
// With dryRun it does the same work in a transaction and rolls it back.
func syncRepos(ctx context.Context, db *sql.DB, repos []repo, dryRun bool, w io.Writer) error {
	out := &errWriter{w: w}
	sort.Slice(repos, func(i, j int) bool { return repos[i].FullName < repos[j].FullName })
	ambiguous := ambiguousShortNames(repos)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer func() {
		if rerr := tx.Rollback(); rerr != nil && !errors.Is(rerr, sql.ErrTxDone) {
			log.Printf("rollback: %v", rerr)
		}
	}()

	verb := "changed"
	if dryRun {
		verb = "would change"
		out.println("Dry run: nothing will be saved.")
	}

	totalRows := int64(0)
	skippedSet := map[string]bool{}
	for _, r := range repos {
		if r.FullName == "" {
			continue
		}
		vis := visibilityOf(r)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO repo_settings (full_name, visibility) VALUES ($1, $2)
			ON CONFLICT (full_name) DO UPDATE SET visibility = EXCLUDED.visibility, updated_at = now()`,
			r.FullName, vis); err != nil {
			return fmt.Errorf("upsert %s: %w", r.FullName, err)
		}

		short := shortName(r)
		if ambiguous[short] {
			skippedSet[short] = true
			short = ""
		}
		res, err := tx.ExecContext(ctx, updateEventsSQL, r.FullName, vis != "public", short)
		if err != nil {
			return fmt.Errorf("update events for %s: %w", r.FullName, err)
		}
		n, err := res.RowsAffected()
		if err != nil {
			return fmt.Errorf("rows affected for %s: %w", r.FullName, err)
		}
		totalRows += n
		out.printf("%-40s %-9s events %s: %d\n", r.FullName, vis, verb, n)
	}

	if len(skippedSet) > 0 {
		skipped := make([]string, 0, len(skippedSet))
		for n := range skippedSet {
			skipped = append(skipped, n)
		}
		sort.Strings(skipped)
		out.printf("Ambiguous short names (matched by full_name only): %s\n", strings.Join(skipped, ", "))
	}
	out.printf("%d repos, events %s: %d\n", len(repos), verb, totalRows)

	if out.err != nil {
		return fmt.Errorf("write output: %w", out.err)
	}
	if dryRun {
		return nil // deferred rollback discards the changes
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// errWriter writes to w and remembers the first error, so callers check once at the end.
type errWriter struct {
	w   io.Writer
	err error
}

func (e *errWriter) printf(format string, args ...any) {
	if e.err == nil {
		_, e.err = fmt.Fprintf(e.w, format, args...)
	}
}

func (e *errWriter) println(args ...any) {
	if e.err == nil {
		_, e.err = fmt.Fprintln(e.w, args...)
	}
}
