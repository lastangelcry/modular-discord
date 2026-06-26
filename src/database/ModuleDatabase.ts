import type { ModuleDatabase, RunResult, SqlDatabaseClient } from './types.js';

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Module-scoped SQL view with automatic table name prefixing */
export class PrefixedModuleDatabase implements ModuleDatabase {
  private readonly prefix: string;

  constructor(
    private readonly db: SqlDatabaseClient,
    moduleId: string
  ) {
    this.prefix = `mod_${sanitizeName(moduleId)}_`;
  }

  table(name: string): string {
    return `${this.prefix}${sanitizeName(name)}`;
  }

  exec(sql: string, params?: unknown[]): Promise<void> {
    return this.db.exec(sql, params);
  }

  run(sql: string, params?: unknown[]): Promise<RunResult> {
    return this.db.run(sql, params);
  }

  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined> {
    return this.db.get<T>(sql, params);
  }

  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.db.all<T>(sql, params);
  }

  transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}
