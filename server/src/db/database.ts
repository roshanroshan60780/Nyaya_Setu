// Use dynamic require so bundlers/vitest treat node:sqlite as external Node built-in
const { DatabaseSync } = require('node:sqlite');
import path from 'path';
import fs from 'fs';

/**
 * SQLite database connection singleton using Node.js built-in node:sqlite.
 * Uses the DATABASE_PATH environment variable, defaulting to ./data/nyayasetu.db.
 * Enables WAL mode for concurrent performance and foreign keys for referential integrity.
 */
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'nyayasetu.db');

// Ensure the data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const rawDb = new DatabaseSync(dbPath);

// Enable WAL mode and foreign key constraints
try {
  rawDb.exec('PRAGMA journal_mode = WAL;');
  rawDb.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  // Pragma execution fallback
}

export interface Statement<T = any> {
  run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: any[]): T | undefined;
  all(...params: any[]): T[];
}

export interface DatabaseWrapper {
  exec(sql: string): void;
  pragma(pragmaStr: string): any;
  prepare<T = any>(sql: string): Statement<T>;
  transaction<F extends (...args: any[]) => any>(fn: F): F;
}

const db: DatabaseWrapper = {
  exec(sql: string): void {
    rawDb.exec(sql);
  },
  pragma(pragmaStr: string): any {
    try {
      rawDb.exec(`PRAGMA ${pragmaStr};`);
    } catch {
      // Ignore pragma errors
    }
  },
  prepare<T = any>(sql: string): Statement<T> {
    const stmt = rawDb.prepare(sql);
    return {
      run(...params: any[]) {
        const res = stmt.run(...params);
        return {
          changes: res.changes,
          lastInsertRowid: Number(res.lastInsertRowid),
        };
      },
      get(...params: any[]): T | undefined {
        return stmt.get(...params) as T | undefined;
      },
      all(...params: any[]): T[] {
        return stmt.all(...params) as T[];
      },
    };
  },
  transaction<F extends (...args: any[]) => any>(fn: F): F {
    const wrapped = (...args: Parameters<F>): ReturnType<F> => {
      rawDb.exec('BEGIN IMMEDIATE TRANSACTION;');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT;');
        return result;
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
      }
    };
    return wrapped as F;
  },
};

export default db;
