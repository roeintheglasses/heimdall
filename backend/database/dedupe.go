package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"time"

	"heimdall-backend/logger"
)

// Duplicate push rules. Both keep the earliest row by (created_at, id) and mark
// a later row as a duplicate when an earlier matching row exists in the window.
const (
	// RuleSameSHA: same repo, branch and non-empty commit_sha within 2 minutes.
	RuleSameSHA = "A"
	// RuleNoSHA: no commit_sha, same repo, branch and title within 10 seconds.
	RuleNoSHA = "B"
)

// DuplicatePushesCTE defines dup(id, rule), the rows to delete. Prepend it to a
// statement that reads from dup. It is exported so integration tests can run it.
const DuplicatePushesCTE = `
WITH dup AS (
	SELECT e.id, '` + RuleSameSHA + `' AS rule
	FROM events e
	WHERE e.event_type = 'github.push'
	AND COALESCE(e.metadata->>'commit_sha', '') <> ''
	AND e.metadata->>'repo' IS NOT NULL
	AND e.metadata->>'branch' IS NOT NULL
	AND EXISTS (
		SELECT 1 FROM events p
		WHERE p.event_type = 'github.push'
		AND p.created_at BETWEEN e.created_at - interval '2 minutes' AND e.created_at
		AND (p.created_at, p.id) < (e.created_at, e.id)
		AND p.metadata->>'repo' = e.metadata->>'repo'
		AND (
			COALESCE(p.metadata->>'full_name', '') = ''
			OR COALESCE(e.metadata->>'full_name', '') = ''
			OR p.metadata->>'full_name' = e.metadata->>'full_name'
		)
		AND p.metadata->>'branch' = e.metadata->>'branch'
		AND p.metadata->>'commit_sha' = e.metadata->>'commit_sha'
	)
	UNION ALL
	SELECT e.id, '` + RuleNoSHA + `' AS rule
	FROM events e
	WHERE e.event_type = 'github.push'
	AND COALESCE(e.metadata->>'commit_sha', '') = ''
	AND e.metadata->>'repo' IS NOT NULL
	AND e.metadata->>'branch' IS NOT NULL
	AND EXISTS (
		SELECT 1 FROM events p
		WHERE p.event_type = 'github.push'
		AND p.created_at BETWEEN e.created_at - interval '10 seconds' AND e.created_at
		AND (p.created_at, p.id) < (e.created_at, e.id)
		AND COALESCE(p.metadata->>'commit_sha', '') = ''
		AND p.metadata->>'repo' = e.metadata->>'repo'
		AND (
			COALESCE(p.metadata->>'full_name', '') = ''
			OR COALESCE(e.metadata->>'full_name', '') = ''
			OR p.metadata->>'full_name' = e.metadata->>'full_name'
		)
		AND p.metadata->>'branch' = e.metadata->>'branch'
		AND p.title = e.title
	)
)`

// DuplicatePushCountsSQL returns one row per rule: rule, count.
const DuplicatePushCountsSQL = DuplicatePushesCTE + `
SELECT rule, COUNT(*) FROM dup GROUP BY rule ORDER BY rule`

// DuplicatePushSamplesSQL returns up to $1 duplicate rows, newest first:
// rule, created_at, repo, branch, short sha, title.
const DuplicatePushSamplesSQL = DuplicatePushesCTE + `
SELECT dup.rule, e.created_at, COALESCE(e.metadata->>'repo', ''), COALESCE(e.metadata->>'branch', ''),
	left(COALESCE(e.metadata->>'commit_sha', ''), 7), e.title
FROM dup JOIN events e ON e.id = dup.id
ORDER BY e.created_at DESC, e.id DESC
LIMIT $1`

// DuplicatePushExportSQL returns each duplicate row as JSON, oldest first.
const DuplicatePushExportSQL = DuplicatePushesCTE + `
SELECT row_to_json(e)::text FROM events e WHERE e.id IN (SELECT id FROM dup) ORDER BY e.created_at, e.id`

// DeleteDuplicatePushesSQL deletes the duplicate rows.
const DeleteDuplicatePushesSQL = DuplicatePushesCTE + `
DELETE FROM events WHERE id IN (SELECT id FROM dup)`

// Queryer is satisfied by *sql.DB and *sql.Tx.
type Queryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

// DuplicateSample is one row a cleanup would delete.
type DuplicateSample struct {
	Rule      string
	CreatedAt time.Time
	Repo      string
	Branch    string
	ShortSHA  string
	Title     string
}

// DuplicateReport summarizes what a cleanup would delete.
type DuplicateReport struct {
	ByRule  map[string]int
	Total   int
	Samples []DuplicateSample
}

// FindDuplicatePushes counts duplicate pushes per rule and returns up to
// maxSamples example rows. It changes nothing.
func FindDuplicatePushes(ctx context.Context, q Queryer, maxSamples int) (DuplicateReport, error) {
	report := DuplicateReport{ByRule: map[string]int{RuleSameSHA: 0, RuleNoSHA: 0}}

	rows, err := q.QueryContext(ctx, DuplicatePushCountsSQL)
	if err != nil {
		return report, fmt.Errorf("count duplicates: %w", err)
	}
	defer closeQuietly(ctx, rows)
	for rows.Next() {
		var rule string
		var n int
		if err = rows.Scan(&rule, &n); err != nil {
			return report, fmt.Errorf("scan duplicate count: %w", err)
		}
		report.ByRule[rule] = n
		report.Total += n
	}
	err = rows.Err()
	if err != nil {
		return report, err
	}

	srows, err := q.QueryContext(ctx, DuplicatePushSamplesSQL, maxSamples)
	if err != nil {
		return report, fmt.Errorf("sample duplicates: %w", err)
	}
	defer closeQuietly(ctx, srows)
	for srows.Next() {
		var s DuplicateSample
		if err := srows.Scan(&s.Rule, &s.CreatedAt, &s.Repo, &s.Branch, &s.ShortSHA, &s.Title); err != nil {
			return report, fmt.Errorf("scan duplicate sample: %w", err)
		}
		report.Samples = append(report.Samples, s)
	}
	return report, srows.Err()
}

// DeleteDuplicatePushes writes the duplicate rows to w as JSON lines, then
// deletes them, all in one repeatable-read transaction. It rolls back unless the
// number of exported rows equals the number of deleted rows. It returns that number.
func DeleteDuplicatePushes(ctx context.Context, db *sql.DB, w io.Writer) (int, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return 0, fmt.Errorf("begin: %w", err)
	}
	defer func() {
		if rerr := tx.Rollback(); rerr != nil && !errors.Is(rerr, sql.ErrTxDone) {
			logger.FromContext(ctx).Warn().Err(rerr).Msg("failed to roll back transaction")
		}
	}()

	rows, err := tx.QueryContext(ctx, DuplicatePushExportSQL)
	if err != nil {
		return 0, fmt.Errorf("export duplicates: %w", err)
	}
	defer closeQuietly(ctx, rows)
	exported := 0
	for rows.Next() {
		var line string
		if err = rows.Scan(&line); err != nil {
			return 0, fmt.Errorf("scan export row: %w", err)
		}
		if !json.Valid([]byte(line)) {
			return 0, fmt.Errorf("export row is not valid JSON")
		}
		if _, err = io.WriteString(w, line+"\n"); err != nil {
			return 0, fmt.Errorf("write export: %w", err)
		}
		exported++
	}
	err = rows.Err()
	if err != nil {
		return 0, err
	}
	closeQuietly(ctx, rows)

	if s, ok := w.(interface{ Sync() error }); ok {
		if err = s.Sync(); err != nil {
			return 0, fmt.Errorf("sync export: %w", err)
		}
	}

	res, err := tx.ExecContext(ctx, DeleteDuplicatePushesSQL)
	if err != nil {
		return 0, fmt.Errorf("delete duplicates: %w", err)
	}
	deleted, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	if int(deleted) != exported {
		return 0, fmt.Errorf("exported %d rows but deleted %d, rolled back", exported, deleted)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit: %w", err)
	}
	return exported, nil
}
