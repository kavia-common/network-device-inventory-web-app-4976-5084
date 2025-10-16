'use strict';

/**
 * Lightweight DB layer supporting PostgreSQL and SQLite driven by env.
 * - DB_CLIENT=pg|sqlite
 * - DATABASE_URL=connection string (for sqlite: file path e.g., sqlite:///data/devices.db or ./data/devices.db)
 */

const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const DB_CLIENT = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || 'sqlite://./data/devices.db';

let pg = null;
let sqlite3 = null;

/** Normalize sqlite file path from DATABASE_URL */
function resolveSqlitePath(url) {
  try {
    // Allow formats: sqlite:///abs/path.db, sqlite://./rel.db, ./rel.db
    if (url.startsWith('sqlite://')) {
      const u = new URL(url);
      let p = u.pathname;
      if (process.platform === 'win32' && p.startsWith('/')) {
        p = p.slice(1);
      }
      return path.resolve(p);
    }
    return path.resolve(url);
  } catch {
    return path.resolve(url);
  }
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY ${DB_CLIENT === 'pg' ? '' : 'AUTOINCREMENT'},
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  mac_address TEXT NOT NULL,
  device_type TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_ping TEXT
);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
`;

class DB {
  constructor() {
    this.client = null;
  }

  async init() {
    if (DB_CLIENT === 'pg') {
      pg = require('pg');
      const { Client } = pg;
      this.client = new Client({ connectionString: DATABASE_URL });
      await this.client.connect();
      // Convert schema to PostgreSQL compatible
      const pgSchema = `
        CREATE TABLE IF NOT EXISTS devices (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          ip_address VARCHAR(64) NOT NULL,
          mac_address VARCHAR(64) NOT NULL,
          device_type VARCHAR(64) NOT NULL,
          location VARCHAR(255) NOT NULL,
          status VARCHAR(16) NOT NULL DEFAULT 'unknown',
          last_ping TIMESTAMP NULL
        );
        CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
      `;
      await this.client.query(pgSchema);
    } else {
      // default sqlite
      sqlite3 = require('sqlite3').verbose();
      const filePath = resolveSqlitePath(DATABASE_URL);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.client = new sqlite3.Database(filePath);
      // run schema
      await new Promise((resolve, reject) => {
        this.client.exec(schemaSql, (err) => (err ? reject(err) : resolve()));
      });
    }
  }

  async query(sql, params = []) {
    if (DB_CLIENT === 'pg') {
      const res = await this.client.query(sql, params);
      return res;
    } else {
      // sqlite
      const isSelect = /^\s*select/i.test(sql);
      const isInsert = /^\s*insert/i.test(sql);
      return await new Promise((resolve, reject) => {
        if (isSelect) {
          this.client.all(sql, params, (err, rows) => (err ? reject(err) : resolve({ rows })));
        } else if (isInsert) {
          this.client.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
          });
        } else {
          this.client.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
          });
        }
      });
    }
  }

  async getOne(sql, params = []) {
    if (DB_CLIENT === 'pg') {
      const res = await this.client.query(sql, params);
      return res.rows[0] || null;
    } else {
      return await new Promise((resolve, reject) => {
        this.client.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
      });
    }
  }

  async close() {
    if (!this.client) return;
    if (DB_CLIENT === 'pg') {
      await this.client.end();
    } else {
      await new Promise((resolve) => this.client.close(() => resolve()));
    }
  }
}

const db = new DB();
db.init().catch((e) => {
  console.error('Failed to initialize database:', e);
  process.exit(1);
});

module.exports = db;
