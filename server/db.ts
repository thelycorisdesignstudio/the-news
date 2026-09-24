import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type DB = Database.Database;

const MIGRATIONS = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT,
     verified INTEGER NOT NULL DEFAULT 0,
     google_sub TEXT UNIQUE,
     apple_sub TEXT UNIQUE,
     created_at TEXT NOT NULL
   );
   CREATE TABLE sessions (
     id_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE email_codes (
     email TEXT PRIMARY KEY COLLATE NOCASE,
     code_hash TEXT NOT NULL,
     expires_at INTEGER NOT NULL,
     sent_at INTEGER NOT NULL,
     attempts INTEGER NOT NULL DEFAULT 0
   );
   CREATE TABLE reset_tokens (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL,
     used INTEGER NOT NULL DEFAULT 0
   );
   CREATE TABLE login_attempts (
     email TEXT PRIMARY KEY COLLATE NOCASE,
     failed INTEGER NOT NULL DEFAULT 0,
     locked_until INTEGER NOT NULL DEFAULT 0
   );
   CREATE TABLE prefs (
     user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     json TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE stories (
     id TEXT PRIMARY KEY,
     cat TEXT NOT NULL,
     topic TEXT NOT NULL,
     title TEXT NOT NULL,
     summary TEXT NOT NULL,
     more_json TEXT NOT NULL DEFAULT '[]',
     source TEXT NOT NULL,
     url TEXT NOT NULL,
     published_at TEXT NOT NULL,
     level TEXT NOT NULL,
     type TEXT NOT NULL DEFAULT 'news',
     country TEXT, region TEXT, city TEXT, area TEXT, lat REAL, lon REAL,
     rank INTEGER NOT NULL DEFAULT 100,
     removed INTEGER NOT NULL DEFAULT 0
   );
   CREATE INDEX stories_published ON stories(published_at);
   CREATE TABLE saves (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     story_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, story_id)
   );
   CREATE TABLE likes (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     story_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, story_id)
   );
   CREATE TABLE history (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     story_id TEXT NOT NULL,
     read_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, story_id)
   );
   CREATE TABLE push_subs (
     endpoint TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     json TEXT NOT NULL,
     last_sent_day TEXT
   );`,
];

export function openDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  const version = db.pragma('user_version', { simple: true }) as number;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
  return db;
}
