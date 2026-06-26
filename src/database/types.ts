export type SqlDialect = 'sqlite' | 'postgres' | 'mysql';

export type DatabaseKind = 'sql' | 'document';

export interface RunResult {
  changes?: number;
  lastInsertRowid?: number | bigint;
  insertId?: number;
}

export interface SqliteDatabaseConfig {
  type: 'sqlite';
  path: string;
  /** Run PRAGMA journal_mode = WAL (default: true) */
  wal?: boolean;
}

export interface PostgresDatabaseConfig {
  type: 'postgres';
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized?: boolean };
}

export interface MysqlDatabaseConfig {
  type: 'mysql';
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: import('mysql2').SslOptions;
}

export interface MongodbDatabaseConfig {
  type: 'mongodb';
  url: string;
  database: string;
}

/** Plug in a custom database backend (e.g. CockroachDB, Turso, Redis) */
export interface CustomDatabaseConfig {
  type: 'custom';
  create: () => DatabaseClient | Promise<DatabaseClient>;
}

export type DatabaseConfig =
  | SqliteDatabaseConfig
  | PostgresDatabaseConfig
  | MysqlDatabaseConfig
  | MongodbDatabaseConfig
  | CustomDatabaseConfig;

export interface ModuleDatabase {
  table(name: string): string;
  exec(sql: string, params?: unknown[]): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface ModuleDocumentStore {
  collection(name: string): string;
  findOne<T = unknown>(collection: string, filter: Record<string, unknown>): Promise<T | null>;
  find<T = unknown>(collection: string, filter?: Record<string, unknown>): Promise<T[]>;
  insertOne(collection: string, doc: Record<string, unknown>): Promise<void>;
  updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<void>;
  deleteOne(collection: string, filter: Record<string, unknown>): Promise<void>;
  replaceOne(
    collection: string,
    filter: Record<string, unknown>,
    doc: Record<string, unknown>
  ): Promise<void>;
}

export type ModuleDataStore = ModuleDatabase | ModuleDocumentStore;

export interface DatabaseClient {
  readonly kind: DatabaseKind;
  connect(): Promise<void>;
  close(): Promise<void>;
  forModule(moduleId: string): ModuleDataStore;
  getModuleEnabled(guildId: string, moduleId: string): Promise<boolean | undefined>;
  setModuleEnabled(guildId: string, moduleId: string, enabled: boolean): Promise<void>;
  loadAllModuleSettings(): Promise<Map<string, Map<string, boolean>>>;
}

export interface SqlDatabaseClient extends DatabaseClient {
  readonly kind: 'sql';
  readonly dialect: SqlDialect;
  exec(sql: string, params?: unknown[]): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface DocumentDatabaseClient extends DatabaseClient {
  readonly kind: 'document';
  findOne<T = unknown>(collection: string, filter: Record<string, unknown>): Promise<T | null>;
  find<T = unknown>(collection: string, filter?: Record<string, unknown>): Promise<T[]>;
  insertOne(collection: string, doc: Record<string, unknown>): Promise<void>;
  updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<void>;
  deleteOne(collection: string, filter: Record<string, unknown>): Promise<void>;
  replaceOne(
    collection: string,
    filter: Record<string, unknown>,
    doc: Record<string, unknown>
  ): Promise<void>;
}

export function isSqlStore(store: ModuleDataStore): store is ModuleDatabase {
  return 'table' in store;
}

export function isDocumentStore(store: ModuleDataStore): store is ModuleDocumentStore {
  return 'collection' in store && !('table' in store);
}
