import DatabaseDriver from 'better-sqlite3';
import type { RunResult, Statement } from 'better-sqlite3';

export interface DatabaseOptions {
  path: string;
  /** Run PRAGMA journal_mode = WAL for better concurrent reads */
  wal?: boolean;
}

/**
 * SQLite wrapper for the bot core and modules.
 * Modules receive a scoped instance via `forModule(id)` — table names are prefixed automatically.
 */
export class Database {
  private readonly driver: DatabaseDriver.Database;

  constructor(options: DatabaseOptions | string) {
    const opts = typeof options === 'string' ? { path: options } : options;
    this.driver = new DatabaseDriver(opts.path);

    if (opts.wal !== false) {
      this.driver.pragma('journal_mode = WAL');
    }
    this.driver.pragma('foreign_keys = ON');
  }

  /** Scoped helper: same connection, tables prefixed with mod_{moduleId}_ */
  forModule(moduleId: string): ModuleDatabase {
    return new ModuleDatabase(this, moduleId);
  }

  /** Raw driver access for advanced use cases */
  raw(): DatabaseDriver.Database {
    return this.driver;
  }

  exec(sql: string): void {
    this.driver.exec(sql);
  }

  run(sql: string, ...params: unknown[]): RunResult {
    return this.driver.prepare(sql).run(...params);
  }

  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined {
    return this.driver.prepare(sql).get(...params) as T | undefined;
  }

  all<T = unknown>(sql: string, ...params: unknown[]): T[] {
    return this.driver.prepare(sql).all(...params) as T[];
  }

  prepare(sql: string): Statement {
    return this.driver.prepare(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.driver.transaction(fn)();
  }

  close(): void {
    this.driver.close();
  }
}

/** Module-scoped database view with automatic table name prefixing */
export class ModuleDatabase {
  private readonly prefix: string;

  constructor(
    private readonly db: Database,
    moduleId: string
  ) {
    this.prefix = `mod_${moduleId}_`;
  }

  table(name: string): string {
    const safe = name.replace(/[^a-zA-Z0-9_]/g, '_');
    return `${this.prefix}${safe}`;
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, ...params: unknown[]): RunResult {
    return this.db.run(sql, ...params);
  }

  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.get<T>(sql, ...params);
  }

  all<T = unknown>(sql: string, ...params: unknown[]): T[] {
    return this.db.all<T>(sql, ...params);
  }

  prepare(sql: string): Statement {
    return this.db.prepare(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn);
  }
}
