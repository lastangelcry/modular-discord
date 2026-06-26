export { BotCore } from './BotCore.js';
export { buildSlashCommand } from './commandBuilder.js';
export {
  createDatabase,
  resolveDatabaseConfig,
  resolveDataPath,
  SqliteDatabase,
  PostgresDatabase,
  MysqlDatabase,
  MongodbDatabase,
  PrefixedModuleDatabase,
  PrefixedModuleDocumentStore,
  isSqlStore,
  isDocumentStore,
} from './database/index.js';
export type {
  DatabaseClient,
  DatabaseConfig,
  DatabaseKind,
  DocumentDatabaseClient,
  ModuleDataStore,
  ModuleDatabase,
  ModuleDocumentStore,
  MongodbDatabaseConfig,
  MysqlDatabaseConfig,
  PostgresDatabaseConfig,
  RunResult,
  SqlDatabaseClient,
  SqlDialect,
  SqliteDatabaseConfig,
  CustomDatabaseConfig,
} from './database/index.js';
export { ModuleListeners } from './ModuleListeners.js';
export type { ListenerOptions } from './ModuleListeners.js';
export { discoverModules } from './ModuleLoader.js';
export {
  PAK_FORMAT_VERSION,
  PAK_MANIFEST_FILE,
  preparePakModule,
} from './pakPackage.js';
export type { PakManifest, PreparedPakModule } from './pakPackage.js';
export type {
  BotConfig,
  CommandDefinition,
  CommandOptionDefinition,
  SubcommandDefinition,
  LoadedModule,
  Module,
  ModuleContext,
  ModuleMeta,
  ModuleRegistry,
} from './types.js';

// Backward-compatible alias for SQLite driver
export { SqliteDatabase as Database } from './database/index.js';
