import type { DocumentDatabaseClient, ModuleDocumentStore } from './types.js';

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Module-scoped MongoDB view with automatic collection name prefixing */
export class PrefixedModuleDocumentStore implements ModuleDocumentStore {
  private readonly prefix: string;

  constructor(
    private readonly db: DocumentDatabaseClient,
    moduleId: string
  ) {
    this.prefix = `mod_${sanitizeName(moduleId)}_`;
  }

  collection(name: string): string {
    return `${this.prefix}${sanitizeName(name)}`;
  }

  findOne<T>(collection: string, filter: Record<string, unknown>): Promise<T | null> {
    return this.db.findOne<T>(this.collection(collection), filter);
  }

  find<T>(collection: string, filter: Record<string, unknown> = {}): Promise<T[]> {
    return this.db.find<T>(this.collection(collection), filter);
  }

  insertOne(collection: string, doc: Record<string, unknown>): Promise<void> {
    return this.db.insertOne(this.collection(collection), doc);
  }

  updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<void> {
    return this.db.updateOne(this.collection(collection), filter, update);
  }

  deleteOne(collection: string, filter: Record<string, unknown>): Promise<void> {
    return this.db.deleteOne(this.collection(collection), filter);
  }

  replaceOne(
    collection: string,
    filter: Record<string, unknown>,
    doc: Record<string, unknown>
  ): Promise<void> {
    return this.db.replaceOne(this.collection(collection), filter, doc);
  }
}
