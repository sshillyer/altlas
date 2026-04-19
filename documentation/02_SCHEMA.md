# Altlas — Database Schema

All tables are defined using **Drizzle ORM** with the `better-sqlite3` driver. The schema file lives at `packages/backend/src/db/schema.ts`. Run migrations via `drizzle-kit push` during development.

---

## Tables

### `characters`

One row per WoW character the user is tracking.

```ts
export const characters = sqliteTable('characters', {
  id:           text('id').primaryKey(),           // nanoid
  name:         text('name').notNull(),
  realm:        text('realm').notNull(),
  region:       text('region').notNull().default('us'),
  class:        text('class').notNull(),            // e.g. 'hunter', 'deathknight'
  spec:         text('spec'),                       // e.g. 'beast_mastery'
  level:        integer('level').default(80),
  ilvl:         integer('ilvl'),                    // nullable; populated via Bnet sync
  professionA:  text('profession_a'),               // e.g. 'mining'
  professionB:  text('profession_b'),
  bnetId:       text('bnet_id'),                    // nullable; set when synced from Bnet
  isMain:       integer('is_main', { mode: 'boolean' }).default(false),
  sortOrder:    integer('sort_order').default(0),   // user-controlled column order in tracker
  createdAt:    text('created_at').notNull(),
  updatedAt:    text('updated_at').notNull(),
});
```

### `task_definitions`

Defines every possible trackable task. Populated from `seed/tasks.json`. Application code never hardcodes task names or logic.

```ts
export const taskDefinitions = sqliteTable('task_definitions', {
  id:           text('id').primaryKey(),            // slug e.g. 'weekly_vault_claim'
  name:         text('name').notNull(),             // display name
  description:  text('description'),
  category:     text('category').notNull(),         // 'vault' | 'profession' | 'pvp' | 'delve' | 'world' | 'dungeon' | 'raid' | 'misc'
  resetType:    text('reset_type').notNull(),       // 'daily' | 'weekly' | 'never'
  scope:        text('scope').notNull(),            // 'per_character' | 'per_account'
  expansion:    text('expansion').notNull(),        // 'midnight' | 'tww' etc.
  season:       text('season'),                     // nullable; e.g. 'season_1'
  isActive:     integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder:    integer('sort_order').default(0),
  notes:        text('notes'),                      // optional tooltip/reminder text
});
```

### `character_tasks`

Join table tracking per-character completion state for each task. One row per (character, taskDefinition) pair. Created automatically when a character is added, for all active tasks.

```ts
export const characterTasks = sqliteTable('character_tasks', {
  id:              text('id').primaryKey(),
  characterId:     text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  taskDefinitionId:text('task_definition_id').notNull().references(() => taskDefinitions.id, { onDelete: 'cascade' }),
  isEnabled:       integer('is_enabled', { mode: 'boolean' }).default(true),  // user can hide per char
  completedAt:     text('completed_at'),            // null = not done; set to ISO timestamp on check
  notes:           text('notes'),                   // per-cell user note
});
```

### `profiles`

Named sets of enabled tasks. "Default" profile ships with all active tasks enabled.

```ts
export const profiles = sqliteTable('profiles', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  isDefault:   integer('is_default', { mode: 'boolean' }).default(false),
  createdAt:   text('created_at').notNull(),
});
```

### `profile_tasks`

Which task definitions are enabled in a given profile.

```ts
export const profileTasks = sqliteTable('profile_tasks', {
  profileId:       text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  taskDefinitionId:text('task_definition_id').notNull().references(() => taskDefinitions.id, { onDelete: 'cascade' }),
});
```

### `reset_log`

Audit trail of every reset event. Used to detect missed resets if the server was down.

```ts
export const resetLog = sqliteTable('reset_log', {
  id:          text('id').primaryKey(),
  resetType:   text('reset_type').notNull(),        // 'daily' | 'weekly'
  region:      text('region').notNull(),
  scheduledAt: text('scheduled_at').notNull(),      // when it was supposed to fire
  executedAt:  text('executed_at').notNull(),       // when it actually ran
  rowsAffected:integer('rows_affected').notNull(),
});
```

### `bnet_tokens`

Stores Battle.net OAuth tokens. At most one active token row (upserted on each auth).

```ts
export const bnetTokens = sqliteTable('bnet_tokens', {
  id:           text('id').primaryKey(),
  accessToken:  text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt:    text('expires_at').notNull(),
  scope:        text('scope'),
  region:       text('region').notNull().default('us'),
  updatedAt:    text('updated_at').notNull(),
});
```

### `app_settings`

Key-value store for application-level settings.

```ts
export const appSettings = sqliteTable('app_settings', {
  key:   text('key').primaryKey(),  // e.g. 'region', 'active_profile_id', 'last_bnet_sync'
  value: text('value').notNull(),
});
```

---

## Indexes

```ts
// Fast lookup of all tasks for a character
index('idx_character_tasks_char', [characterTasks.characterId]);

// Fast lookup of completion state for a specific task across all chars
index('idx_character_tasks_task', [characterTasks.taskDefinitionId]);

// Unique constraint on character name+realm+region
uniqueIndex('idx_characters_identity', [characters.name, characters.realm, characters.region]);

// Unique constraint on profile_tasks join
uniqueIndex('idx_profile_tasks_unique', [profileTasks.profileId, profileTasks.taskDefinitionId]);
```

---

## Seed Behavior

On first run (or when `NODE_ENV=seed` is set), the backend runs `seeder.ts` which:

1. Reads `seed/tasks.json`
2. Upserts each task definition (insert or update by `id`)
3. Creates a "Default" profile with all active tasks enabled
4. Does NOT delete existing `character_tasks` rows — safe to re-run

This means adding new tasks to `seed/tasks.json` and re-seeding will add them to the Default profile without wiping any character completion data.
