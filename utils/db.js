// utils/db.js
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../data/teampulse.db');

// створюємо папку під БД, якщо треба
const dir = dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Відкриваємо синхронно (better-sqlite3 — sync API)
const db = new Database(DB_PATH, { fileMustExist: false });

// PRAGMA
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Схема
db.exec(`
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

// Уніфікований інтерфейс
export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const info = Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
  return { lastID: info.lastInsertRowid, changes: info.changes };
}
export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
}
export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
}

// Транзакції коли потрібно
export const transaction = (fn) => db.transaction(fn);

// 🔧 Shim для старого коду — повертає об'єкт з тим же API
export function getDB() {
  return { run, get, all, transaction };
}
