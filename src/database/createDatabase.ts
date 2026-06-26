import { dirname } from 'node:path';
import { MysqlDatabase } from './drivers/mysql.js';
import { MongodbDatabase } from './drivers/mongodb.js';
import { PostgresDatabase } from './drivers/postgres.js';
import { SqliteDatabase } from './drivers/sqlite.js';
import type { BotConfig } from '../types.js';
import type { DatabaseClient, DatabaseConfig } from './types.js';

export async function createDatabase(config: DatabaseConfig): Promise<DatabaseClient> {
  let client: DatabaseClient;

  switch (config.type) {
    case 'sqlite':
      client = new SqliteDatabase(config.path, config.wal !== false);
      break;
    case 'postgres':
      client = new PostgresDatabase(config);
      break;
    case 'mysql':
      client = new MysqlDatabase(config);
      break;
    case 'mongodb':
      client = new MongodbDatabase(config);
      break;
    case 'custom':
      client = await config.create();
      break;
    default: {
      const unknown = config as { type: string };
      throw new Error(`Unsupported database type: ${unknown.type}`);
    }
  }

  await client.connect();
  return client;
}

export function resolveDatabaseConfig(config: BotConfig): DatabaseConfig {
  if (config.database) {
    return config.database;
  }

  if (config.databasePath) {
    return { type: 'sqlite', path: config.databasePath };
  }

  throw new Error('BotConfig requires either "database" or "databasePath"');
}

export function resolveDataPath(config: BotConfig): string {
  if (config.dataPath) {
    return config.dataPath;
  }

  if (config.database?.type === 'sqlite') {
    return dirname(config.database.path);
  }

  if (config.databasePath) {
    return dirname(config.databasePath);
  }

  return process.cwd();
}
