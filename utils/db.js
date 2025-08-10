import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../data/teampulse.db');

export async function getDB() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec(`
    PRAGMA journal_mode=WAL;

    CREATE TABLE IF NOT EXISTS clients(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT,
      negotiator TEXT,
      sector TEXT,
      goal TEXT,
      decision_criteria TEXT,
      constraints TEXT,
      user_goals TEXT,
      client_goals TEXT,
      weekly_hours INTEGER,
      offered_services TEXT,
      deadlines TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analyses(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      source TEXT,
      original_filename TEXT,
      tokens_estimated INTEGER,
      highlights_json TEXT,
      summary_json TEXT,
      barometer_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS usage_daily(
      day TEXT PRIMARY KEY,
      tokens_used INTEGER DEFAULT 0,
      locked_until TEXT
    );
  `);
  return db;
}
