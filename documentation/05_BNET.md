# AltWatch — Battle.net Integration

Battle.net integration is **fully optional**. The app works completely without it. Characters can be created and managed manually. Bnet sync adds ilvl, profession data, and character enrichment on top of whatever the user has already set up.

---

## Setup

1. Go to [https://develop.battle.net](https://develop.battle.net) and create a client.
2. Set the redirect URI to: `http://localhost:3001/api/auth/callback`
3. Copy the Client ID and Client Secret into `.env`:
   ```
   BNET_CLIENT_ID=your_client_id
   BNET_CLIENT_SECRET=your_client_secret
   BNET_REGION=us
   BNET_REDIRECT_URI=http://localhost:3001/api/auth/callback
   ```
4. If these env vars are not set, the frontend hides all Bnet-related UI and the auth routes return `{ available: false }`.

---

## OAuth 2.0 Flow

### Step 1 — Authorization URL
`GET /api/auth/bnet/url` constructs and returns:
```
https://oauth.battle.net/authorize
  ?client_id={BNET_CLIENT_ID}
  &redirect_uri={BNET_REDIRECT_URI}
  &response_type=code
  &scope=wow.profile
  &state={random_state_token}
```
Store the `state` token in `app_settings` key `bnet_oauth_state` for CSRF validation.

### Step 2 — Callback
Blizzard redirects to `GET /api/auth/callback?code=...&state=...`.

Backend:
1. Validate `state` matches stored value. If not, return 400.
2. POST to `https://oauth.battle.net/token` with:
   - `grant_type=authorization_code`
   - `code={code}`
   - `redirect_uri={BNET_REDIRECT_URI}`
   - Basic auth header: `base64(CLIENT_ID:CLIENT_SECRET)`
3. Store the returned `access_token`, `refresh_token`, `expires_in` in `bnet_tokens` (upsert by region).
4. Redirect browser to `{FRONTEND_URL}/auth/success`.

### Step 3 — Token Refresh
Before making any Blizzard API call, check if `expiresAt < now + 5min`. If so, refresh:

POST to `https://oauth.battle.net/token`:
- `grant_type=refresh_token`
- `refresh_token={stored_refresh_token}`
- Basic auth header

Update `bnet_tokens` with the new values.

---

## Blizzard API Calls

Base URL depends on region:
- US: `https://us.api.blizzard.com`
- EU: `https://eu.api.blizzard.com`
- KR: `https://kr.api.blizzard.com`

All requests include header: `Authorization: Bearer {access_token}`

### Get All Characters
```
GET /profile/user/wow?namespace=profile-{region}&locale=en_US
```
Returns `wow_accounts[].characters[]` with name, realm, class, level, playable_class.

### Get Character Summary (ilvl)
```
GET /profile/wow/character/{realmSlug}/{characterName}?namespace=profile-{region}&locale=en_US
```
Returns `average_item_level`, `equipped_item_level`, `active_spec`.

### Get Character Professions
```
GET /profile/wow/character/{realmSlug}/{characterName}/professions?namespace=profile-{region}&locale=en_US
```
Returns `primaries[]` and `secondaries[]` with profession names.

### Get Mythic Keystone Profile (M+ score)
```
GET /profile/wow/character/{realmSlug}/{characterName}/mythic-keystone-profile?namespace=profile-{region}&locale=en_US
```
Returns `current_mythic_rating.rating`.

---

## Sync Logic

**`POST /api/sync/characters`** — full sync:

1. Call Blizzard "Get All Characters" endpoint.
2. For each character returned at level 70+:
   - Look up in local `characters` table by `name + realm + region`.
   - If found: update `ilvl`, `bnetId`, `updatedAt`. Preserve all user-set fields (professions, isMain, sortOrder).
   - If not found: insert new character with defaults. `isEnabled` tasks are created for all active task definitions.
3. Return summary of added/updated counts.

**`POST /api/sync/characters/:id`** — single character sync:

1. Fetch character summary + professions from Blizzard.
2. Update `ilvl`, `spec`, `professionA`, `professionB` from API response.
3. Do not overwrite user-manually-set values unless the API value is non-null.

---

## Implementation Files

```
packages/backend/src/bnet/
├── oauth.ts        # buildAuthUrl, exchangeCode, refreshToken
├── apiClient.ts    # authenticated fetch wrapper with auto-refresh
└── sync.ts         # syncAllCharacters, syncSingleCharacter
```

---

## Error Handling

- If the Bnet token is expired and refresh fails, delete the token row and return `401` with `{ error: 'bnet_token_expired', message: 'Please reconnect your Battle.net account.' }`.
- If Blizzard returns 404 for a character (renamed, transferred, deleted), mark the character in the local DB with a `syncError` note but do not delete it.
- All Bnet API errors should be logged but should never crash the Fastify process.
