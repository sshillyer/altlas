# AltWatch — Phased Build Plan

> **For Claude Code:** Read all prior docs (01–06) before starting any phase. Implement phases in order. Do not skip ahead. Each phase has explicit acceptance criteria — do not move on until they pass.

---

## Suggested Prompt Pattern

```
I'm building AltWatch, a self-hosted WoW alt tracker. Here are the architecture docs:
[attach relevant .md files]

Please implement Phase X: [phase name].
Follow the types, schema, and patterns defined in the docs exactly.
Start with the file/folder structure, then implement each file.
Ask me before making decisions that aren't covered by the docs.
```

---

## Phase 1 — Project Scaffold

**Goal:** Monorepo running with backend serving a health check and frontend rendering a placeholder page.

**Docs to include:** `01_OVERVIEW.md`

**Deliverables:**
- `pnpm-workspace.yaml` with `packages/*`
- `packages/backend/` — Fastify app, TypeScript, `GET /api/health` returns `{ ok: true }`
- `packages/frontend/` — Vite + React + TypeScript, renders `<h1>AltWatch</h1>`
- `docker-compose.yml` with backend service + volume mount for `./data`
- `.env.example` with all variables
- `packages/backend/src/db/` — Drizzle schema (all tables from `02_SCHEMA.md`), `client.ts` connecting to `DB_PATH`
- DB migration runs on backend startup (`drizzle-kit push` or inline `migrate()`)

**Acceptance:**
- `docker compose up` starts cleanly
- `GET http://localhost:3001/api/health` returns `{ ok: true }`
- Frontend loads at `http://localhost:5173`
- SQLite file created at `./data/altwatch.db`

---

## Phase 2 — Seed + Character CRUD

**Goal:** Seed task definitions from `seed/tasks.json`. Full character management API + frontend view.

**Docs to include:** `01_OVERVIEW.md`, `02_SCHEMA.md`, `03_API.md`, `06_FRONTEND.md`

**Deliverables:**
- `seed/tasks.json` — initial Midnight task seed (see `08_SEED.md`)
- `packages/backend/src/seed/seeder.ts` — reads tasks.json, upserts definitions, creates Default profile
- Seeder runs on startup if `task_definitions` table is empty
- All character routes: `GET`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /reorder`
- When a character is created, auto-create `character_tasks` for all active task definitions
- `CharactersView` frontend: list, add form, delete with confirm, drag-to-reorder

**Acceptance:**
- Can add a character manually via the UI
- Character appears in list with class and profession info
- Deleting a character removes it and its tasks
- `character_tasks` rows exist in DB for the new character

---

## Phase 3 — Tracker View

**Goal:** The main tracker grid is functional with manual check/uncheck.

**Docs to include:** `02_SCHEMA.md`, `03_API.md`, `06_FRONTEND.md`

**Deliverables:**
- `GET /api/tasks/state` endpoint returning full denormalized tracker data
- `PATCH /api/tasks/character/:id` toggle endpoint
- `TrackerView` component with:
  - Character columns with class color indicator and name
  - Task rows grouped by category with sticky group headers
  - Checkbox cells — click to complete, click again to un-complete
  - Per-account tasks rendered as single merged cell
  - Completed cells visually distinct (muted background + checkmark)
  - Disabled tasks shown as dash
- Reset countdown strip showing time to next daily and weekly reset (static calculation, no live ticker yet)

**Acceptance:**
- Tracker renders all characters as columns and all tasks as rows
- Clicking a checkbox marks it complete in the DB and updates the UI
- Page refresh preserves completion state
- Group headers are visible and collapsible (optional stretch)

---

## Phase 4 — Reset Scheduler

**Goal:** Automatic daily and weekly resets fire on schedule, with startup catch-up.

**Docs to include:** `04_SCHEDULER.md`

**Deliverables:**
- `packages/backend/src/scheduler/resetJobs.ts`
- `packages/backend/src/scheduler/runReset.ts`
- `packages/backend/src/scheduler/catchUp.ts`
- `initScheduler()` called in `main.ts` after DB ready
- `GET /api/resets/schedule` and `GET /api/resets/log` endpoints
- `POST /api/resets/trigger` (dev only)
- Reset countdown in `TrackerView` updates live (setInterval every second)

**Acceptance:**
- `POST /api/resets/trigger` with `{ "type": "daily" }` clears all daily tasks
- `GET /api/resets/log` shows the triggered reset
- On backend restart, if a reset was due while server was down, it runs immediately
- Countdown timer in UI ticks down correctly for the configured region

---

## Phase 5 — Profiles

**Goal:** Named profiles filter which tasks appear in the tracker.

**Docs to include:** `03_API.md`, `06_FRONTEND.md`

**Deliverables:**
- All profile routes (list, create, get, patch, delete, activate)
- `ProfilesView` — list profiles, create with task checklist, activate, delete
- Tracker respects active profile — only tasks in the active profile's task list appear
- Profile selector dropdown in the tracker header

**Acceptance:**
- Creating a profile with a subset of tasks and activating it filters the tracker grid correctly
- Switching profiles updates the grid immediately without page refresh
- Default profile cannot be deleted

---

## Phase 6 — Battle.net Integration

**Goal:** Optional Bnet OAuth flow and character sync.

**Docs to include:** `05_BNET.md`

**Deliverables:**
- `packages/backend/src/bnet/oauth.ts` — auth URL builder, code exchange, token refresh
- `packages/backend/src/bnet/apiClient.ts` — authenticated fetch with auto-refresh
- `packages/backend/src/bnet/sync.ts` — full sync + single character sync
- All `/api/auth/*` and `/api/sync/*` routes
- `SettingsView` — Bnet connection status, connect button, disconnect button, last sync time
- "Sync from Battle.net" button in `CharactersView`
- If `BNET_CLIENT_ID` is not set in env, all Bnet UI is hidden and auth routes return `{ available: false }`

**Acceptance:**
- Clicking "Connect Battle.net" opens Blizzard OAuth in browser
- After auth, token is stored and status shows connected
- "Sync Characters" imports characters from Blizzard and enriches existing ones with ilvl
- Disconnecting removes the token

---

## Phase 7 — Polish + Docker Production Build

**Goal:** Production-ready Docker setup, quality-of-life improvements.

**Deliverables:**
- `packages/frontend/Dockerfile` — builds static files, served by nginx
- `docker-compose.yml` updated to serve frontend via nginx (not dev server)
- `docker-compose.dev.yml` for hot-reload development mode
- Per-cell notes (click a cell to open a small popover with a text note field)
- `PATCH /api/tasks/character/:id/toggle-enabled` + UI to disable tasks per character
- Character edit inline (spec, professions, isMain)
- Settings view: region selector persisted to `app_settings`
- README.md with setup instructions

**Acceptance:**
- `docker compose up` in production mode serves the full app with no dev dependencies
- Notes can be set on any cell and persist across resets (notes are not cleared by reset)
- Disabled tasks show as dash and don't toggle
