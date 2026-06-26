import { PrefixedModuleDocumentStore } from '../ModuleDocumentStore.js';
import type {
  DocumentDatabaseClient,
  ModuleDataStore,
  MongodbDatabaseConfig,
} from '../types.js';

type MongoClient = import('mongodb').MongoClient;
type MongoDb = import('mongodb').Db;
type MongoCollection = import('mongodb').Collection;

const GUILD_SETTINGS = 'guild_module_settings';

async function loadMongodb(): Promise<typeof import('mongodb')> {
  try {
    return await import('mongodb');
  } catch {
    throw new Error('MongoDB driver not found. Install it: npm install mongodb');
  }
}

export class MongodbDatabase implements DocumentDatabaseClient {
  readonly kind = 'document' as const;

  private client?: MongoClient;
  private db?: MongoDb;
  private readonly config: MongodbDatabaseConfig;

  constructor(config: MongodbDatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const { MongoClient } = await loadMongodb();
    this.client = new MongoClient(this.config.url);
    await this.client.connect();
    this.db = this.client.db(this.config.database);

    await this.collection(GUILD_SETTINGS).createIndex(
      { guild_id: 1, module_id: 1 },
      { unique: true }
    );
  }

  forModule(moduleId: string): ModuleDataStore {
    return new PrefixedModuleDocumentStore(this, moduleId);
  }

  async getModuleEnabled(guildId: string, moduleId: string): Promise<boolean | undefined> {
    const doc = await this.findOne<{ enabled: boolean }>(GUILD_SETTINGS, {
      guild_id: guildId,
      module_id: moduleId,
    });
    return doc === null ? undefined : doc.enabled;
  }

  async setModuleEnabled(guildId: string, moduleId: string, enabled: boolean): Promise<void> {
    await this.collection(GUILD_SETTINGS).updateOne(
      { guild_id: guildId, module_id: moduleId },
      { $set: { guild_id: guildId, module_id: moduleId, enabled } },
      { upsert: true }
    );
  }

  async loadAllModuleSettings(): Promise<Map<string, Map<string, boolean>>> {
    const docs = await this.find<{ guild_id: string; module_id: string; enabled: boolean }>(
      GUILD_SETTINGS
    );

    const settings = new Map<string, Map<string, boolean>>();
    for (const doc of docs) {
      let guild = settings.get(doc.guild_id);
      if (!guild) {
        guild = new Map();
        settings.set(doc.guild_id, guild);
      }
      guild.set(doc.module_id, doc.enabled);
    }
    return settings;
  }

  async findOne<T>(collection: string, filter: Record<string, unknown>): Promise<T | null> {
    const doc = await this.collection(collection).findOne(filter);
    return doc as T | null;
  }

  async find<T>(collection: string, filter: Record<string, unknown> = {}): Promise<T[]> {
    const docs = await this.collection(collection).find(filter).toArray();
    return docs as T[];
  }

  async insertOne(collection: string, doc: Record<string, unknown>): Promise<void> {
    await this.collection(collection).insertOne(doc);
  }

  async updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<void> {
    await this.collection(collection).updateOne(filter, { $set: update });
  }

  async deleteOne(collection: string, filter: Record<string, unknown>): Promise<void> {
    await this.collection(collection).deleteOne(filter);
  }

  async replaceOne(
    collection: string,
    filter: Record<string, unknown>,
    doc: Record<string, unknown>
  ): Promise<void> {
    await this.collection(collection).replaceOne(filter, doc, { upsert: true });
  }

  async close(): Promise<void> {
    await this.client?.close();
    this.client = undefined;
    this.db = undefined;
  }

  private collection(name: string): MongoCollection {
    return this.requireDb().collection(name);
  }

  private requireDb(): MongoDb {
    if (!this.db) {
      throw new Error('MongoDB database is not connected. Call connect() first.');
    }
    return this.db;
  }
}
