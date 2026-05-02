# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev        # run with tsx (no build step, hot TypeScript execution)
pnpm run build      # compile TypeScript → dist/
pnpm start          # run compiled output (requires build first)

docker compose up -d --build   # build image and start container
docker compose logs -f         # tail logs
docker compose restart         # pick up settings.json changes
```

No test runner is configured yet.

## Architecture

This is a job scraper for Iranian employment websites that sends matches to a Bale messenger bot. It has three independent subsystems that run concurrently inside a single Node.js process:

**1. Hono HTTP server** (`src/index.ts`)
Thin API for external control (`/crawl/run`, `/scheduler/start`, `/scheduler/stop`, `/status`). Entry point that boots the other two subsystems.

**2. Bale bot long-poller** (`src/bale/`)
Polls `getUpdates` every 2 seconds. Handles Persian keyboard button presses and slash commands. `commands.ts` maps both button labels and `/commands` to the same handlers via `BUTTON_ALIASES`. All bot responses include `MAIN_MENU` (a `ReplyKeyboardMarkup`) to keep the persistent keyboard visible.

**3. Crawler + scheduler** (`src/crawler/`, `src/scheduler.ts`)
`scheduler.ts` sets a `setInterval` per enabled site and calls `runAllAdapters()` on each tick. `runner.ts` owns the crawl lifecycle: it guards against concurrent runs via `cancellation.ts` (an `AbortController` wrapper), iterates enabled sites, calls each adapter, scores results, deduplicates, and sends to Bale.

## Adding a new job site

1. Add an entry to `settings.json` with `enabled: true` and a `searchUrl` containing `{keyword}` as placeholder.
2. Create `src/crawler/adapters/<sitename>.ts` extending `BaseAdapter`. Implement `scrape()` — iterate `keywords.searchQueries`, call `this.buildSearchUrl(query)`, parse job cards, filter with `this.isWithinDays()`, check `requiredMatch`, return `JobPost[]` with `id` from `makeJobId()`.
3. Register it in the `getAdapter()` switch in `src/crawler/runner.ts`.

## Key data flows

**Scoring** (`src/scorer.ts`): Each job gets a base location score (remote=10, mashhad=8, unspecified=5, other city=2) then bonus points for tech keywords. Capped at 10. Only jobs ≥ `minScoreToNotify` are sent.

**Deduplication** (`src/deduplicator.ts`): Job IDs are base64url-encoded strings of `site::title::company::postedAt`. Seen IDs persist in `data/seen-jobs.json`.

**Recipients**: If `bale.chatIds` in `settings.json` is non-empty, only those IDs receive messages. If empty, broadcasts to all users in `data/bot-users.json` (populated when users send `/start` to the bot).

**Crawl cancellation**: `/stop` bot command calls `abortCrawl()` which fires the `AbortController`. The runner checks `signal.aborted` between adapters and between individual job notifications.

## Configuration

All runtime config lives in `settings.json` (never baked into the image — mounted as a bind volume in Docker). Validated at startup with Zod; process exits on invalid config. Reload requires restart.

`loginUrl` being non-empty is the signal that a site requires authentication — no separate `requiresAuth` flag.

## Runtime persistence

| File | Contents |
|---|---|
| `data/seen-jobs.json` | Set of sent job IDs (deduplication) |
| `data/bot-users.json` | Registered Bale chat IDs (from `/start`) |

Both are auto-created on first write. In Docker, `data/` is a named volume.
