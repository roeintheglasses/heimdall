# Goal: make Heimdall's data trustworthy, its alerts useful, and its UI usable

Heimdall is my personal dev-activity monitor (see CLAUDE.md for architecture). It ingests GitHub, Vercel and Railway webhooks into Postgres and shows them on a public dashboard. A recent audit fixed auth, privacy and live-feed bugs. This goal covers what is still wrong or missing. Each item below exists because the current behavior gives wrong numbers, hides failures, or leaves dead code. Do not add anything beyond this list.

## 1. Data correctness

- **Duplicate pushes.** Until recently 27 repos had two webhooks each, so many past pushes are stored twice. This inflates `/api/stats`, streaks, `/me` and wrapped.
  - Write a one-off cleanup that finds duplicates by repo, branch and commit SHA within a 2-minute window and keeps the earliest row.
  - Run it as a SELECT first, show me the counts and a sample, and wait for my OK before deleting.
  - Before deleting, take a Neon backup branch and export the deleted rows to a file.
- **Prevent recurrence.** For GitHub push events, derive `delivery_id` from repo full name, ref and head commit SHA instead of `X-GitHub-Delivery`, so two hooks on one repo cannot double-store a push. Keep the current behavior for other event types.
- **Repo identity.** Store the repo `full_name` in metadata for new GitHub events, alongside the existing short name.
- **Privacy that matches reality.** Every event from before the privacy migration is marked private, so the public dashboard shows almost nothing useful.
  - Add a `repo_settings` table (full_name, visibility, hidden, updated_at) through a new migration.
  - Add a `backend/cmd/repos sync` command, in the style of `cmd/migrate`, that reads my repos' visibility from the GitHub API, upserts `repo_settings`, and updates `is_private` on existing events.
  - Events from repos with `hidden = true` must not appear in `/api/events` or the stream at all.
  - Aggregates keep counting everything, as they do now.

## 2. Tell me when something breaks

- **Failure alerts.** When a newly inserted event is a failed or crashed Vercel or Railway deploy, or a failed GitHub Actions run, POST a short message to `ALERT_WEBHOOK_URL`.
  - Use a Discord-compatible JSON body; ntfy and Slack should work with the same shape or a small switch.
  - Send it asynchronously with a timeout, never for duplicates, and do nothing if the env var is unset.
- **GitHub Actions failures.**
  - Subscribe the hooks to `workflow_run` and update `scripts/add-webhooks.js`. That script should also report hooks whose host is Heimdall but whose URL is not the current one.
  - Store only `completed` runs whose conclusion is `failure`, `timed_out` or `cancelled`, as `error.ci`, and answer every other run with 202 ignored.
  - Redact private CI failures the same way as other private events.
- **Commit context on Vercel deploys.** Keep the branch, commit SHA, commit message and repo from the Vercel payload's `meta` in metadata, so alerts and the detail drawer can say what broke. Do not add them to the redaction allowlist.
- **Honest health.** The backend `/api/health` must ping Postgres with a 2-second timeout and return 503 on failure. Add `/api/health/live` without the DB check, and point the Docker HEALTHCHECK at it so a Neon cold start does not restart the container.
- **Honest status.** Replace the hard-coded "OPERATIONAL" text on the landing page with real data: backend health and the time of the last event.

## 3. Make the dashboard readable

- **Time.**
  - Group the event list under day headers (Today, Yesterday, then dates).
  - Render timestamps as `<time dateTime>` with the exact time in a tooltip, and refresh relative labels every minute.
  - Change the activity graph from a 1-hour window to 7 days with daily buckets, and hide it when the window has no events.
- **Grouping.** `EventGroup.tsx` and `eventGrouping.ts` exist but nothing imports them. Either wire them in or delete them.
  - Wire them in as a grouped view that collapses runs of same-type events from one repo, or, for private events, the same type within a short gap.
  - Add a toggle for grouped or flat, and remember the choice.
  - Remove the duplicated "Private repository:" wording when the PRIVATE badge is shown.
- **Filters.**
  - Keep service, category, repo and search in URL params so views survive reloads and can be shared.
  - When filters are active and older events exist, pass type and date filters to the backend, which already supports them, instead of filtering only what is loaded. If backend filtering cannot cover a filter, say how many events were searched.
- **Navigation.** Add a small shared nav for Dashboard, Stats (`/me`) and Wrapped (the current month).
- **Accessibility, to WCAG 2.1 AA on the pages touched:**
  - A polite live region that announces new events, throttled.
  - `role="status"` with a text label on the connection indicator.
  - Event cards as real buttons with accessible names.
  - No `Button` nested inside `Link`; use `asChild`.
  - A labelled search input with a visible focus ring.
  - Hit areas of at least 44px for icon buttons.
  - The Enter and "/" shortcuts actually working.
  - `motion-reduce` variants on all entry animations, the card hover transforms and smooth scrolling.
  - Text no smaller than 12px.
- **Mobile.**
  - The landing page uses `min-h-dvh` instead of `h-screen overflow-hidden`, with a real `<h1>`.
  - The ASCII logo is `aria-hidden` and hidden on very small screens.
  - The sticky ticker that duplicates the list is removed on mobile.

## 4. Keep it maintainable

- **Real Postgres in CI.** Add a `postgres:16` service to the backend CI job, run migrations, and add integration tests for:
  - duplicate inserts;
  - push delivery IDs;
  - cursor pagination;
  - type and since filters;
  - redaction and hidden repos through the real query;
  - the health DB check;
  - the dedupe query.
- **Unit tests for new code.** Cover the alert sender, the `workflow_run` filter, the grouping logic and URL filter parsing.
- **Lower polling cost.** Raise the SSE poll interval from 5 to 15 seconds.
- **Docs.** Update CLAUDE.md, README and `.env.example` for the new env vars, the command, the event type and the endpoints.

## Constraints

- **PRs.** Ship as four PRs in the order above, each small enough to review, with CI green before merge.
- **Production data.** Do not touch production data without showing me the plan and getting my OK. Back up first.
- **Secrets.** Never print secrets.
- **Existing behavior.** Keep current auth, redaction and aggregate behavior unless an item above changes it.
- **Scope.** If an item turns out to be wrong once you read the code, tell me instead of building it anyway.

## Done when

- Stats no longer count duplicate pushes.
- New duplicates cannot be stored.
- My public repos show as public on the dashboard.
- A failed deploy or CI run reaches my alert channel within a minute.
- The dashboard is readable on a phone and usable with a keyboard and screen reader.
- CI runs the database tests on every PR.
