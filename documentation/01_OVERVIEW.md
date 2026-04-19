# Altlas — Project Overview

> **Audience:** This document is written for a Claude Code agent. Read all docs in numerical order before writing any code. Follow the phased build plan in `07_PHASES.md` strictly — do not implement features from a later phase until the current phase is complete. When in doubt, build the simplest thing that works and move on.

---

## What Is Altlas?

Altlas is a self-hosted, local-first web application for World of Warcraft players who actively manage multiple characters (alts). It provides:

- A weekly/daily task tracker across all characters, with automatic resets on the correct WoW schedule
- Character management with profession assignments, class tracking, and per-character task enable/disable
- Named profiles (e.g. "Full Sweep", "Casual Week") that control which tasks are active
- Optional Battle.net OAuth integration to pull character data directly from Blizzard's API
- A seed-driven task definition system so that expansion/season content changes can be updated without code changes

The app is designed to run locally via Docker Compose or directly via Node.js. There is no cloud component. All data lives in a local SQLite file.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast DX, same as user's other projects |
| Backend | Fastify + TypeScript | Lightweight, fast, first-class TS, familiar to user |
| Database | SQLite via Drizzle ORM | Zero infra, file-based, trivial backup, perfect for local-first |
| Scheduler | node-cron | Simple cron-based reset jobs in the backend process |
| Auth | Battle.net OAuth 2.0 | Blizzard's standard OAuth for character data access |
| Containerization | Docker Compose | Single `docker compose up` to run the whole app |
| Package structure | Monorepo (pnpm workspaces) | `packages/frontend` + `packages/backend` |

---

## Key Design Principles

**Local-first.** No accounts, no cloud sync, no telemetry. The SQLite file in `./data/` is the entire database. Users back it up by copying one file.

**Seed-driven task definitions.** Tasks are not hardcoded in the application. They live in `seed/tasks.json`. When a new WoW season starts, the user (or community) updates the seed file and re-seeds the database. Application code does not need to change.

**Per-character task state.** Each task completion is stored as a `CharacterTask` row with a `completedAt` timestamp. Reset jobs null out `completedAt` on schedule. This means the full history of resets is preserved in a `ResetLog` table.

**Battle.net integration is optional.** The app works fully without connecting to Blizzard. Characters can be created manually. Bnet sync enriches existing characters with ilvl, profession data, vault state, etc.

**Profiles are task filters.** A Profile is a named set of enabled `TaskDefinition` IDs. Switching profiles changes which tasks appear in the tracker view. Characters always exist independently of profiles.

---

## Repository Structure

```
altlas/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── pnpm-workspace.yaml
├── packages/
│   ├── frontend/
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── api/           # typed fetch client pointing at backend
│   │       ├── store/         # Zustand stores
│   │       ├── views/
│   │       │   ├── TrackerView.tsx
│   │       │   ├── CharactersView.tsx
│   │       │   └── ProfilesView.tsx
│   │       └── components/
│   └── backend/
│       ├── Dockerfile
│       └── src/
│           ├── main.ts        # Fastify server entry
│           ├── db/
│           │   ├── schema.ts  # Drizzle schema
│           │   └── client.ts  # DB connection singleton
│           ├── routes/
│           │   ├── characters.ts
│           │   ├── tasks.ts
│           │   ├── profiles.ts
│           │   ├── auth.ts
│           │   └── resets.ts
│           ├── scheduler/
│           │   └── resetJobs.ts
│           ├── bnet/
│           │   ├── oauth.ts
│           │   └── apiClient.ts
│           └── seed/
│               └── seeder.ts  # reads ../../../seed/tasks.json
├── seed/
│   └── tasks.json             # canonical Midnight task definitions
└── data/
    └── altlas.db            # SQLite file (gitignored, Docker volume)
```

---

## Environment Variables

Store in `.env` (copied from `.env.example`). Never commit `.env`.

```
# Required
PORT=3001
FRONTEND_URL=http://localhost:5173
DB_PATH=./data/altlas.db

# Battle.net OAuth (optional — app works without these)
BNET_CLIENT_ID=
BNET_CLIENT_SECRET=
BNET_REGION=us
BNET_REDIRECT_URI=http://localhost:3001/auth/callback
```
