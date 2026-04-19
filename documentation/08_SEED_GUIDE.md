# AltWatch — Seed Data Guide

The file `seed/tasks.json` is the canonical source of truth for all trackable tasks. It is read by `seeder.ts` at startup. No application code should hardcode task names or categories.

---

## Task Definition Format

```json
{
  "id": "string — unique slug, snake_case, stable across updates",
  "name": "string — display name shown in tracker",
  "description": "string | null — tooltip/reminder text",
  "category": "vault | profession | pvp | delve | world | dungeon | raid | misc",
  "resetType": "daily | weekly | never",
  "scope": "per_character | per_account",
  "expansion": "midnight",
  "season": "string | null — e.g. season_1, or null for evergreen tasks",
  "isActive": true,
  "sortOrder": 0,
  "notes": "string | null — extra reminder shown in UI"
}
```

### Field Notes

**`id`** — Must be stable. Do not rename an ID or it will create a duplicate row on re-seed. If a task is retired, set `isActive: false` instead of deleting.

**`scope: per_account`** — Task is done once per account, not per character. Example: World Boss. The tracker renders a single merged cell for these.

**`scope: per_character`** — Task is tracked independently per character. Example: Great Vault claim.

**`resetType: never`** — Used for one-time setup tasks or things the user wants to track manually without automatic reset. Example: "Unlock Tier 11 Delves".

**`season`** — Tasks tied to a specific season can be bulk-deactivated by setting `isActive: false` when the season ends, without deleting data.

---

## Updating the Seed

To add tasks for a new patch or season:
1. Add new entries to `seed/tasks.json`
2. Restart the backend (or call `POST /api/admin/reseed` in dev mode)
3. The seeder upserts by `id` — existing completion data is preserved
4. New tasks are automatically added to the Default profile and to all existing characters' `character_tasks`

To retire a task:
1. Set `"isActive": false` in `tasks.json`
2. Re-seed — the task will be hidden from new characters but historical data is preserved

---

## Category Labels (used in TrackerView group headers)

| category | Display Label |
|----------|--------------|
| vault | Great Vault |
| profession | Professions |
| pvp | PvP |
| delve | Delves |
| world | World Content |
| dungeon | Dungeons |
| raid | Raid |
| misc | Miscellaneous |
