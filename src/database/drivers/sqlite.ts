import DatabaseDriver from 'better-sqlite3';
import {
  enabledFromDb,
  enabledToDb,
  guildModuleSettingsSchema,
  guildModuleSettingsUpsert,
} from '../dialect.js';
import { PrefixedModuleDatabase } from '../ModuleDatabase.js';
import type { ModuleDataStore, RunResult, SqlDatabaseClient } from '../types.js';

export class SqliteDatabase implements SqlDatabaseClient {
  readonly kind = 'sql' as const;
  readonly dialect = 'sqlite' as const;

  private driver?: DatabaseDriver.Database;
  private readonly path: string;
  private readonly wal: boolean;

  constructor(path: string, wal = true) {
    this.path = path;
    this.wal = wal;
  }

  async connect(): Promise<void> {
    this.driver = new DatabaseDriver(this.path);

    if (this.wal) {
      this.driver.pragma('journal_mode = WAL');
    }
    this.driver.pragma('foreign_keys = ON');
    this.driver.exec(guildModuleSettingsSchema('sqlite'));
  }

  forModule(moduleId: string): ModuleDataStore {
    return new PrefixedModuleDatabase(this, moduleId);
  }

  async getModuleEnabled(guildId: string, moduleId: string): Promise<boolean | undefined> {
    const row = await this.get<{ enabled: number }>(
      `SELECT enabled FROM guild_module_settings WHERE guild_id = ? AND module_id = ?`,
      [guildId, moduleId]
    );
    return row === undefined ? undefined : enabledFromDb(row.enabled);
  }

  async setModuleEnabled(guildId: string, moduleId: string, enabled: boolean): Promise<void> {
    await this.run(guildModuleSettingsUpsert('sqlite'), [
      guildId,
      moduleId,
      enabledToDb('sqlite', enabled),
    ]);
  }

  async loadAllModuleSettings(): Promise<Map<string, Map<string, boolean>>> {
    const rows = await this.all<{ guild_id: string; module_id: string; enabled: number }>(
      `SELECT guild_id, module_id, enabled FROM guild_module_settings`
    );

    const settings = new Map<string, Map<string, boolean>>();
    for (const row of rows) {
      let guild = settings.get(row.guild_id);
      if (!guild) {
        guild = new Map();
        settings.set(row.guild_id, guild);
      }
      guild.set(row.module_id, enabledFromDb(row.enabled));
    }
    return settings;
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    const driver = this.requireDriver();
    if (params.length === 0) {
      driver.exec(sql);
      return;
    }
    driver.prepare(sql).run(...params);
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const driver = this.requireDriver();
    const result = driver.prepare(sql).run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const driver = this.requireDriver();
    return driver.prepare(sql).get(...params) as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const driver = this.requireDriver();
    return driver.prepare(sql).all(...params) as T[];
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const driver = this.requireDriver();
    driver.prepare('BEGIN').run();
    try {
      const result = await fn();
      driver.prepare('COMMIT').run();
      return result;
    } catch (err) {
      driver.prepare('ROLLBACK').run();
      throw err;
    }
  }

  async close(): Promise<void> {
    this.driver?.close();
    this.driver = undefined;
  }

  /** Raw better-sqlite3 driver for advanced use cases */
  raw(): DatabaseDriver.Database {
    return this.requireDriver();
  }

  private requireDriver(): DatabaseDriver.Database {
    if (!this.driver) {
      throw new Error('SQLite database is not connected. Call connect() first.');
    }
    return this.driver;
  }
}
