import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const characters = sqliteTable('characters', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  realm:       text('realm').notNull(),
  region:      text('region').notNull().default('us'),
  class:       text('class').notNull(),
  spec:        text('spec'),
  level:       integer('level').default(80),
  ilvl:        integer('ilvl'),
  professionA: text('profession_a'),
  professionB: text('profession_b'),
  bnetId:      text('bnet_id'),
  isMain:      integer('is_main', { mode: 'boolean' }).default(false),
  sortOrder:   integer('sort_order').default(0),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
}, (table) => ({
  identityIdx: uniqueIndex('idx_characters_identity').on(table.name, table.realm, table.region),
}));

export const taskDefinitions = sqliteTable('task_definitions', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  category:    text('category').notNull(),
  resetType:   text('reset_type').notNull(),
  scope:       text('scope').notNull(),
  expansion:   text('expansion').notNull(),
  season:      text('season'),
  isActive:    integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder:   integer('sort_order').default(0),
  notes:       text('notes'),
});

export const characterTasks = sqliteTable('character_tasks', {
  id:               text('id').primaryKey(),
  characterId:      text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  taskDefinitionId: text('task_definition_id').notNull().references(() => taskDefinitions.id, { onDelete: 'cascade' }),
  isEnabled:        integer('is_enabled', { mode: 'boolean' }).default(true),
  completedAt:      text('completed_at'),
  notes:            text('notes'),
}, (table) => ({
  charIdx: index('idx_character_tasks_char').on(table.characterId),
  taskIdx: index('idx_character_tasks_task').on(table.taskDefinitionId),
}));

export const profiles = sqliteTable('profiles', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  isDefault:   integer('is_default', { mode: 'boolean' }).default(false),
  createdAt:   text('created_at').notNull(),
});

export const profileTasks = sqliteTable('profile_tasks', {
  profileId:        text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  taskDefinitionId: text('task_definition_id').notNull().references(() => taskDefinitions.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueIdx: uniqueIndex('idx_profile_tasks_unique').on(table.profileId, table.taskDefinitionId),
}));

export const resetLog = sqliteTable('reset_log', {
  id:           text('id').primaryKey(),
  resetType:    text('reset_type').notNull(),
  region:       text('region').notNull(),
  scheduledAt:  text('scheduled_at').notNull(),
  executedAt:   text('executed_at').notNull(),
  rowsAffected: integer('rows_affected').notNull(),
});

export const bnetTokens = sqliteTable('bnet_tokens', {
  id:           text('id').primaryKey(),
  accessToken:  text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt:    text('expires_at').notNull(),
  scope:        text('scope'),
  region:       text('region').notNull().default('us'),
  updatedAt:    text('updated_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
});
