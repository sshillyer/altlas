# AltWatch — API Routes

All routes are served by Fastify at `http://localhost:3001`. The frontend communicates exclusively through this API. All request/response bodies are JSON. Dates are ISO 8601 strings.

Fastify should register all routes under a `/api` prefix. CORS should allow requests from `FRONTEND_URL`.

---

## Characters

### `GET /api/characters`
Returns all characters ordered by `sortOrder` ascending.

**Response:**
```json
[
  {
    "id": "abc123",
    "name": "Thraxon",
    "realm": "Stormrage",
    "region": "us",
    "class": "hunter",
    "spec": "beast_mastery",
    "level": 80,
    "ilvl": 632,
    "professionA": "mining",
    "professionB": "engineering",
    "isMain": true,
    "sortOrder": 0,
    "bnetId": "12345678",
    "createdAt": "2026-04-18T00:00:00.000Z",
    "updatedAt": "2026-04-18T00:00:00.000Z"
  }
]
```

### `POST /api/characters`
Create a character manually.

**Body:**
```json
{
  "name": "Thraxon",
  "realm": "Stormrage",
  "region": "us",
  "class": "hunter",
  "spec": "beast_mastery",
  "professionA": "mining",
  "professionB": "engineering",
  "isMain": false
}
```

**Response:** Created character object. Also creates `character_tasks` rows for all active task definitions with `isEnabled: true`.

### `PATCH /api/characters/:id`
Update a character's editable fields (name, spec, professions, isMain, sortOrder).

### `DELETE /api/characters/:id`
Delete a character and cascade-delete all its `character_tasks`.

### `POST /api/characters/reorder`
Update sort order for all characters in one call.

**Body:**
```json
{ "order": ["id1", "id2", "id3"] }
```

---

## Tasks

### `GET /api/tasks/definitions`
Returns all task definitions. Supports `?expansion=midnight&active=true` query params.

### `GET /api/tasks/state`
The primary tracker data endpoint. Returns a denormalized view optimized for the tracker grid.

**Response:**
```json
{
  "characters": [...],
  "taskGroups": [
    {
      "category": "vault",
      "label": "Vault",
      "tasks": [
        {
          "definitionId": "weekly_vault_claim",
          "name": "Vault Claimed",
          "resetType": "weekly",
          "scope": "per_character",
          "characterState": {
            "abc123": { "characterTaskId": "xyz", "isEnabled": true, "completedAt": null, "notes": null },
            "def456": { "characterTaskId": "uvw", "isEnabled": true, "completedAt": "2026-04-15T15:00:00.000Z", "notes": null }
          }
        }
      ]
    }
  ],
  "nextDailyReset": "2026-04-19T15:00:00.000Z",
  "nextWeeklyReset": "2026-04-21T15:00:00.000Z"
}
```

### `PATCH /api/tasks/character/:characterTaskId`
Toggle completion or update notes for a single character+task cell.

**Body:**
```json
{
  "completedAt": "2026-04-18T20:00:00.000Z",  // null to un-complete
  "notes": "optional note"
}
```

### `PATCH /api/tasks/character/:characterTaskId/toggle-enabled`
Enable or disable a task for a specific character.

---

## Profiles

### `GET /api/profiles`
Returns all profiles.

### `POST /api/profiles`
Create a profile.

**Body:**
```json
{
  "name": "Casual Week",
  "description": "Just vault and profession weeklies",
  "taskDefinitionIds": ["weekly_vault_claim", "profession_weekly_1"]
}
```

### `GET /api/profiles/:id`
Returns profile with its enabled task definition IDs.

### `PATCH /api/profiles/:id`
Update name, description, or task definition list.

### `DELETE /api/profiles/:id`
Delete profile. Cannot delete the Default profile.

### `POST /api/profiles/:id/activate`
Sets `app_settings` key `active_profile_id` to this profile's ID. The tracker view filters tasks by the active profile.

---

## Resets

### `GET /api/resets/schedule`
Returns the next daily and weekly reset timestamps for the configured region.

**Response:**
```json
{
  "region": "us",
  "nextDaily": "2026-04-19T15:00:00.000Z",
  "nextWeekly": "2026-04-22T15:00:00.000Z",
  "lastDailyReset": "2026-04-18T15:00:00.000Z",
  "lastWeeklyReset": "2026-04-15T15:00:00.000Z"
}
```

### `GET /api/resets/log`
Returns the last 20 reset log entries.

### `POST /api/resets/trigger`
**Dev/admin only.** Manually trigger a reset. Body: `{ "type": "daily" | "weekly" }`. Protected by a check for `NODE_ENV !== 'production'` OR a simple admin token env var.

---

## Auth (Battle.net)

### `GET /api/auth/bnet/url`
Returns the Blizzard OAuth authorization URL to redirect the user to.

**Response:**
```json
{ "url": "https://oauth.battle.net/authorize?client_id=...&redirect_uri=...&scope=wow.profile&state=..." }
```

### `GET /api/auth/callback`
Blizzard redirects here with `?code=...&state=...`. Backend exchanges code for tokens, stores in `bnet_tokens`, redirects browser to `FRONTEND_URL/auth/success`.

### `GET /api/auth/status`
Returns whether a valid Bnet token exists.

**Response:**
```json
{ "connected": true, "expiresAt": "2026-04-18T22:00:00.000Z" }
```

### `DELETE /api/auth/bnet`
Revokes and deletes stored token.

---

## Sync (Battle.net)

### `POST /api/sync/characters`
Fetches all characters from Blizzard API using the stored token and upserts them into the `characters` table. Matches existing characters by `name + realm + region`. Returns a sync summary.

**Response:**
```json
{
  "added": 3,
  "updated": 8,
  "skipped": 0,
  "characters": [...]
}
```

### `POST /api/sync/characters/:id`
Sync a single character's ilvl, profession data, and vault state.

---

## Settings

### `GET /api/settings`
Returns all app settings as a key-value object.

### `PATCH /api/settings`
Update one or more settings.

**Body:**
```json
{ "region": "eu", "active_profile_id": "profile_abc" }
```
