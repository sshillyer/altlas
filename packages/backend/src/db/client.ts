import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname, resolve, isAbsolute } from 'path';
import * as schema from './schema';

const rawDbPath = process.env.DB_PATH ?? './data/altlas.db';
// Resolve relative paths from the repo root (3 levels up from src/db/ or dist/db/)
const dbPath = isAbsolute(rawDbPath)
  ? rawDbPath
  : resolve(__dirname, '../../../../', rawDbPath);

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function runMigrations(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id          TEXT PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      realm       TEXT NOT NULL,
      region      TEXT NOT NULL DEFAULT 'us',
      class       TEXT NOT NULL,
      spec        TEXT,
      level       INTEGER DEFAULT 80,
      ilvl        INTEGER,
      profession_a TEXT,
      profession_b TEXT,
      bnet_id     TEXT,
      is_main     INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_definitions (
      id          TEXT PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      category    TEXT NOT NULL,
      reset_type  TEXT NOT NULL,
      scope       TEXT NOT NULL,
      expansion   TEXT NOT NULL,
      season      TEXT,
      is_active   INTEGER DEFAULT 1,
      sort_order  INTEGER DEFAULT 0,
      notes       TEXT
    );

    CREATE TABLE IF NOT EXISTS character_tasks (
      id                  TEXT PRIMARY KEY NOT NULL,
      character_id        TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      task_definition_id  TEXT NOT NULL REFERENCES task_definitions(id) ON DELETE CASCADE,
      is_enabled          INTEGER DEFAULT 1,
      completed_at        TEXT,
      notes               TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id          TEXT PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      is_default  INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile_tasks (
      profile_id          TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      task_definition_id  TEXT NOT NULL REFERENCES task_definitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reset_log (
      id            TEXT PRIMARY KEY NOT NULL,
      reset_type    TEXT NOT NULL,
      region        TEXT NOT NULL,
      scheduled_at  TEXT NOT NULL,
      executed_at   TEXT NOT NULL,
      rows_affected INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bnet_tokens (
      id            TEXT PRIMARY KEY NOT NULL,
      access_token  TEXT NOT NULL,
      refresh_token TEXT,
      expires_at    TEXT NOT NULL,
      scope         TEXT,
      region        TEXT NOT NULL DEFAULT 'us',
      updated_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_character_tasks_char
      ON character_tasks(character_id);

    CREATE INDEX IF NOT EXISTS idx_character_tasks_task
      ON character_tasks(task_definition_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_identity
      ON characters(name, realm, region);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_tasks_unique
      ON profile_tasks(profile_id, task_definition_id);
  `);
}
