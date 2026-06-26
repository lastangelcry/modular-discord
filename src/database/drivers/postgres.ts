import {
  convertPlaceholders,
  enabledFromDb,
  enabledToDb,
  guildModuleSettingsSchema,
  guildModuleSettingsUpsert,
} from '../dialect.js';
import { PrefixedModuleDatabase } from '../ModuleDatabase.js';
import type { ModuleDataStore, PostgresDatabaseConfig, RunResult, SqlDatabaseClient } from '../types.js';

type PgPool = import('pg').Pool;
type PgPoolClient = import('pg').PoolClient;
type PgQueryable = PgPool | PgPoolClient;

async function loadPg(): Promise<typeof import('pg')> {
  try {
    return await import('pg');
  } catch {
    throw new Error('PostgreSQL driver not found. Install it: npm install pg');
  }
}

export class PostgresDatabase implements SqlDatabaseClient {
  readonly kind = 'sql' as const;
  readonly dialect = 'postgres' as const;

  private pool?: PgPool;
  private txClient?: PgPoolClient;
  private readonly config: PostgresDatabaseConfig;

  constructor(config: PostgresDatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const pg = await loadPg();
    this.pool = this.config.url
      ? new pg.Pool({ connectionString: this.config.url, ssl: this.config.ssl })
      : new pg.Pool({
          host: this.config.host ?? 'localhost',
          port: this.config.port ?? 5432,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: this.config.ssl,
        });

    await this.exec(guildModuleSettingsSchema('postgres'));
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
    await this.run(guildModuleSettingsUpsert('postgres'), [
      guildId,
      moduleId,
      enabledToDb('postgres', enabled),
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
    const { sql: converted, params: convertedParams } = convertPlaceholders(sql, 'postgres', params);
    await this.queryTarget().query(converted, convertedParams);
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const { sql: converted, params: convertedParams } = convertPlaceholders(sql, 'postgres', params);
    const result = await this.queryTarget().query(converted, convertedParams);
    return { changes: result.rowCount ?? 0 };
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const { sql: converted, params: convertedParams } = convertPlaceholders(sql, 'postgres', params);
    const result = await this.queryTarget().query(converted, convertedParams);
    return result.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { sql: converted, params: convertedParams } = convertPlaceholders(sql, 'postgres', params);
    const result = await this.queryTarget().query(converted, convertedParams);
    return result.rows as T[];
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const pool = this.requirePool();
    const client = await pool.connect();
    this.txClient = client;

    try {
      await client.query('BEGIN');
      const result = await fn();
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      this.txClient = undefined;
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.pool = undefined;
  }

  private queryTarget(): PgQueryable {
    return this.txClient ?? this.requirePool();
  }

  private requirePool(): PgPool {
    if (!this.pool) {
      throw new Error('PostgreSQL database is not connected. Call connect() first.');
    }
    return this.pool;
  }
}
