import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS flows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    steps_json TEXT NOT NULL DEFAULT '[]',
    mapping_json TEXT NOT NULL DEFAULT '[]',
    output_path TEXT,
    schedule_cron TEXT,
    storage_state_path TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS run_history (
    id TEXT PRIMARY KEY,
    flow_id TEXT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('running', 'success', 'error')),
    rows_count INTEGER,
    error_message TEXT,
    output_file_path TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_run_history_flow_id ON run_history(flow_id)`
]

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized — call initDb() first')
  }
  return db
}

export function initDb(): Database.Database {
  const dbPath = join(app.getPath('userData'), 'parser-desktop.sqlite3')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  for (const migration of MIGRATIONS) {
    db.exec(migration)
  }

  try {
    db.exec('ALTER TABLE flows ADD COLUMN step_timeout_ms INTEGER NOT NULL DEFAULT 8000')
  } catch {
    // column already exists from a previous run
  }

  return db
}
