import {
  enabledFromDb,
  enabledToDb,
  guildModuleSettingsSchema,
  guildModuleSettingsUpsert,
} from '../dialect.js';
import { PrefixedModuleDatabase } from '../ModuleDatabase.js';
import type { ModuleDataStore, MysqlDatabaseConfig, RunResult, SqlDatabaseClient } from '../types.js';

type MysqlPool = import('mysql2/promise').Pool;
type MysqlPoolConnection = import('mysql2/promise').PoolConnection;
type MysqlValues = import('mysql2/promise').ExecuteValues;

type MysqlQueryable = MysqlPool | MysqlPoolConnection;

function toMysqlParams(params: unknown[]): MysqlValues {
  return params as MysqlValues;
}

async function loadMysql(): Promise<typeof import('mysql2/promise')> {
  try {
    return await import('mysql2/promise');
  } catch {
    throw new Error('MySQL driver not found. Install it: npm install mysql2');
  }
}

export class MysqlDatabase implements SqlDatabaseClient {
  readonly kind = 'sql' as const;
  readonly dialect = 'mysql' as const;

  private pool?: MysqlPool;
  private txConnection?: MysqlPoolConnection;
  private readonly config: MysqlDatabaseConfig;

  constructor(config: MysqlDatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const mysql = await loadMysql();
    const poolOptions: import('mysql2/promise').PoolOptions = {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 3306,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl,
    };
    this.pool = this.config.url ? mysql.createPool(this.config.url) : mysql.createPool(poolOptions);

    await this.exec(guildModuleSettingsSchema('mysql'));
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
    await this.run(guildModuleSettingsUpsert('mysql'), [
      guildId,
      moduleId,
      enabledToDb('mysql', enabled),
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
    await this.queryTarget().execute(sql, toMysqlParams(params));
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const [result] = await this.queryTarget().execute(sql, toMysqlParams(params));
    const header = result as import('mysql2/promise').ResultSetHeader;
    return {
      changes: header.affectedRows,
      insertId: header.insertId,
    };
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const [rows] = await this.queryTarget().execute(sql, toMysqlParams(params));
    const list = rows as T[];
    return list[0];
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.queryTarget().execute(sql, toMysqlParams(params));
    return rows as T[];
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const pool = this.requirePool();
    const connection = await pool.getConnection();
    this.txConnection = connection;

    try {
      await connection.beginTransaction();
      const result = await fn();
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      this.txConnection = undefined;
      connection.release();
    }
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.pool = undefined;
  }

  private queryTarget(): MysqlQueryable {
    return this.txConnection ?? this.requirePool();
  }

  private requirePool(): MysqlPool {
    if (!this.pool) {
      throw new Error('MySQL database is not connected. Call connect() first.');
    }
    return this.pool;
  }
}
