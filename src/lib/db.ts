import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "votely.db");

let db: Database.Database | null = null;

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      position INTEGER NOT NULL,
      UNIQUE (poll_id, position)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      voter_token TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (poll_id, voter_token)
    );

    CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id);
    CREATE INDEX IF NOT EXISTS idx_options_poll ON poll_options(poll_id);
  `);
}

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const instance = new Database(DB_PATH);
  instance.pragma("journal_mode = WAL");
  migrate(instance);
  db = instance;
  return instance;
}
