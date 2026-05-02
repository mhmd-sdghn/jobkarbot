# Jobkar bot — جابکار بات

A smart job scraper for Iranian employment websites. Monitors job boards for Django/Python positions, scores each listing, and sends matching results to a Bale messenger bot.

---

## Prerequisites

- Node.js 20+
- npm
- A Bale bot token (from [@BotFather](https://ble.ir/BotFather) on Bale)

---

## First-time Setup

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Configure settings

Edit `settings.json`:

- `bale.botToken` — your Bale bot token
- `bale.chatIds` — list of chat IDs to notify (leave `[]` to notify everyone who sends `/start` to the bot)
- `keywords.searchQueries` — what to search on each site
- `keywords.scoring.minScoreToNotify` — minimum score (1–10) to send a notification
- `sites[].searchUrl` — search page URL with `{keyword}` placeholder
- `sites[].loginUrl` — login page URL (leave `""` if auth not needed)
- `sites[].enabled` — set `true` to activate a site
- `sites[].crawlIntervalMinutes` — how often to crawl (in minutes)
- `sites[].maxDaysOld` — ignore jobs older than this many days

### 3. Get your Bale chat ID

Start the app, then send any message to your bot in Bale. The bot will register you automatically when you send `/start`.

---

## Development

Runs TypeScript directly with hot-reload via `tsx`. No build step needed.

```bash
npm run dev
```

Server starts at `http://localhost:3000`.

To use a different port:

```bash
PORT=8080 npm run dev
```

---

## Production

### Option A — Run directly with Node (simple VPS)

**Step 1: Build**

```bash
npm run build
```

This compiles TypeScript into `dist/`.

**Step 2: Start**

```bash
npm start
```

---

### Option B — PM2 (recommended for VPS, auto-restart on crash/reboot)

**Install PM2 globally:**

```bash
npm install -g pm2
```

**Start the app:**

```bash
# development-style (no build needed, uses tsx)
pm2 start npm --name jobkar -- run dev

# OR production (after npm run build)
pm2 start npm --name jobkar -- start
```

**Useful PM2 commands:**

```bash
pm2 status          # view running processes
pm2 logs jobkar     # live logs
pm2 restart jobkar  # restart
pm2 stop jobkar     # stop
pm2 delete jobkar   # remove from PM2
```

**Auto-start on server reboot:**

```bash
pm2 save
pm2 startup         # follow the printed instruction
```

---

### Option C — systemd service (Linux VPS)

Create `/etc/systemd/system/jobkar.service`:

```ini
[Unit]
Description=Jobkar Job Scraper
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/jobkar
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable jobkar
sudo systemctl start jobkar
sudo systemctl status jobkar
```

---

## Bot Commands (Persian)

Send these commands to your bot in Bale:

| Command | Action |
|---|---|
| `/start` | Register and start receiving job notifications |
| `/stop` | Unsubscribe from notifications |
| `/crawl` | Trigger an immediate crawl on all enabled sites |
| `/on` | Enable scheduled automatic crawling |
| `/off` | Disable scheduled automatic crawling |
| `/status` | Show scheduler state and last run times |

---

## HTTP API

The app also exposes a small REST API for external control:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/status` | Scheduler state + last run per site |
| `POST` | `/crawl/run` | Trigger crawl on all enabled sites |
| `POST` | `/scheduler/start` | Start scheduled crawling |
| `POST` | `/scheduler/stop` | Stop scheduled crawling |

Example:

```bash
curl -X POST http://localhost:3000/crawl/run
```

---

## Project Structure

```
jobkar/
├── settings.json                  # all configuration
├── data/
│   ├── seen-jobs.json             # auto-created, tracks sent job IDs
│   └── bot-users.json             # auto-created, tracks Bale subscribers
├── src/
│   ├── index.ts                   # entry point (Hono server + bot polling)
│   ├── config.ts                  # loads and validates settings.json
│   ├── types.ts                   # TypeScript interfaces
│   ├── scorer.ts                  # keyword matching + 1-10 scoring
│   ├── deduplicator.ts            # prevents duplicate notifications
│   ├── scheduler.ts               # per-site interval timers
│   ├── bale/
│   │   ├── client.ts              # Bale API client
│   │   ├── users.ts               # subscriber management
│   │   ├── commands.ts            # bot command handlers
│   │   └── poller.ts              # long-polling for bot messages
│   └── crawler/
│       ├── runner.ts              # orchestrates all adapters
│       └── adapters/
│           ├── base.ts            # abstract base adapter
│           ├── jobinja.ts         # Jobinja adapter
│           └── ...                # one file per site
├── package.json
└── tsconfig.json
```

---

## Adding a New Job Site

1. Add the site entry to `settings.json` (copy an existing one, set `enabled: true`)
2. Create `src/crawler/adapters/<sitename>.ts` extending `BaseAdapter`
3. Register it in `src/crawler/runner.ts` inside the `getAdapter()` switch

---

## Scoring System

Each job is scored 1–10 before being sent:

| Condition | Base Score |
|---|---|
| Remote / دورکاری mentioned | 10 |
| Mashhad / مشهد mentioned | 8 |
| No location info | 5 |
| Other city (onsite) | 2 |

Bonus points (up to +4) are added for matching tech keywords like `python`, `fastapi`, `drf`, `docker`, etc. Final score is capped at 10.

Only jobs with score ≥ `minScoreToNotify` (default: 4) are sent to Bale.
