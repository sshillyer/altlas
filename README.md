# Altlas

A self-hosted World of Warcraft alt tracker. Track daily and weekly tasks across all your characters in a single spreadsheet-like view. Supports automatic resets on WoW's regional schedule, named task profiles, and optional Battle.net character sync.

---

## Quick Start (Docker — Production)

**Prerequisites:** Docker with the Compose plugin.

```bash
# 1. Clone the repo
git clone <repo-url> altlas && cd altlas

# 2. Create your .env from the example
cp .env.example .env
# Edit .env — see Environment Variables below

# 3. Build and start
docker compose up -d --build

# 4. Open http://localhost in your browser
```

The frontend is served by nginx on port 80. The backend runs internally on port 3001 and is accessed only through the nginx proxy — you do not need to expose it.

---

## Local Development (No Docker)

**Prerequisites:** Node.js 22+, pnpm 9+.

```bash
# Install dependencies
pnpm install

# Copy and edit env
cp .env.example .env
# Set FRONTEND_URL=http://localhost:5173

# Start backend (hot-reload)
pnpm --filter backend dev

# In another terminal — start frontend (hot-reload)
pnpm --filter frontend dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- The Vite dev server proxies `/api/*` to the backend automatically.

---

## Development with Docker

For Docker-based development with hot-reload (slower than local on Windows due to bind mounts):

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

- Frontend dev server: http://localhost:5173
- Backend API: http://localhost:3001

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Yes | `3001` | Backend port |
| `DB_PATH` | Yes | `./data/altlas.db` | SQLite database path |
| `FRONTEND_URL` | Yes | — | Allowed CORS origin. Dev: `http://localhost:5173`. Docker prod: `http://localhost` |
| `BNET_CLIENT_ID` | No | — | Battle.net app client ID (leave blank to disable Bnet features) |
| `BNET_CLIENT_SECRET` | No | — | Battle.net app client secret |
| `BNET_REGION` | No | `us` | Default Bnet region for OAuth (`us`, `eu`, `kr`, `tw`) |
| `BNET_REDIRECT_URI` | No | — | OAuth callback URL. Dev: `http://localhost:3001/api/auth/callback`. Docker prod: `http://localhost/api/auth/callback` |

### Docker production .env example

```env
PORT=3001
DB_PATH=/app/data/altlas.db
FRONTEND_URL=http://localhost
BNET_CLIENT_ID=
BNET_CLIENT_SECRET=
BNET_REGION=us
BNET_REDIRECT_URI=http://localhost/api/auth/callback
```

---

## Battle.net Integration (Optional)

Connecting Battle.net allows Altlas to automatically import your characters with ilvl, spec, and professions from Blizzard's API.

### Register a Battle.net Application

1. Go to https://develop.battle.net/ and sign in.
2. Click **Create Client** (or manage an existing one).
3. Set the **Redirect URI** to match your `BNET_REDIRECT_URI`:
   - Local dev: `http://localhost:3001/api/auth/callback`
   - Docker production: `http://localhost/api/auth/callback`
   - Remote server: `https://your-domain.com/api/auth/callback`
4. Copy the **Client ID** and **Client Secret** into your `.env`.
5. Restart the app — the Battle.net section will appear in Settings.

### Connecting

1. Go to **Settings** → click **Connect Battle.net**.
2. Authorize in the Blizzard OAuth page.
3. After redirect, go to **Characters** → click **Sync from Battle.net**.

---

## Data

The SQLite database is stored at `DB_PATH` (default `./data/altlas.db`). For Docker, the `./data` directory is mounted as a volume — your data persists across container rebuilds.

**Backup:** Copy `./data/altlas.db` to a safe location.

---

## Reset Schedule

Altlas automatically clears task completions at WoW's regional reset times:

| Region | Daily Reset | Weekly Reset |
|---|---|---|
| US / Oceanic | 15:00 UTC daily | 15:00 UTC Tuesday |
| EU | 07:00 UTC daily | 07:00 UTC Wednesday |
| KR / TW | 01:00 UTC daily | 01:00 UTC Wednesday |

The region is configured in **Settings** and persists to the database. Changing it immediately reschedules the cron jobs — no restart needed. If the server was offline during a scheduled reset, the catch-up runs automatically on startup.

**Notes are never cleared by resets** — only `completedAt` is reset.

---

## Tracker Tips

- **Left-click** a cell to toggle it complete/incomplete.
- **Right-click** a cell to open the note popover. Notes persist across resets.
- From the note popover you can also **disable** a task for a specific character (shows as `—` and is not clickable).
- Use **Profiles** to create subsets of tasks (e.g. a "Casual" profile with just vault + professions).
- The region countdown strip at the top of the tracker ticks live.

---

## Tech Stack

- **Backend:** Node.js 22, Fastify, Drizzle ORM, SQLite (better-sqlite3), node-cron
- **Frontend:** React 18, Vite, Zustand, Tailwind CSS, @dnd-kit
- **Database:** SQLite file on disk (no external services required)
- **Auth:** Battle.net OAuth 2.0 (optional)
