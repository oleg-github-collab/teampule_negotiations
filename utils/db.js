// utils/db.js
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Шлях до БД (Railway Volume або локальний)
const DB_PATH = process.env.DB_PATH || join(__dirname, '../data/teampulse.db');

// Проміс-обгортки для sqlite3
function wrapDb(db) {
  return {
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) return reject(err);
          // повертаємо lastID/changes через this
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
      });
    },
    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
      });
    }
  };
}

let cached = null;

export async function getDB() {
  if (cached) return cached;

  // Вмикаємо verbose у дев режимі для дебагу
  if (process.env.NODE_ENV !== 'production') {
    sqlite3.verbose();
  }

  // Ініціалізація
  const raw = new sqlite3.Database(DB_PATH);
  const db = wrapDb(raw);

  // PRAGMA + схема
  await db.run(`PRAGMA journal_mode=WAL;`);
  await db.run(`PRAGMA foreign_keys=ON;`);

  await db.run(`
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
  `);

  await db.run(`
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
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS usage_daily(
      day TEXT PRIMARY KEY,
      tokens_used INTEGER DEFAULT 0,
      locked_until TEXT
    );
  `);

  cached = db;
  return cached;
}
