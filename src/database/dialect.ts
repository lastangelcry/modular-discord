import type { SqlDialect } from './types.js';

export function convertPlaceholders(
  sql: string,
  dialect: SqlDialect,
  params: unknown[] = []
): { sql: string; params: unknown[] } {
  if (dialect !== 'postgres') {
    return { sql, params };
  }

  let index = 0;
  const converted = sql.replace(/\?/g, () => `$${++index}`);
  return { sql: converted, params };
}

export function guildModuleSettingsSchema(dialect: SqlDialect): string {
  if (dialect === 'mysql') {
    return `
      CREATE TABLE IF NOT EXISTS guild_module_settings (
        guild_id VARCHAR(255) NOT NULL,
        module_id VARCHAR(255) NOT NULL,
        enabled TINYINT NOT NULL DEFAULT 1,
        PRIMARY KEY (guild_id, module_id)
      );
    `;
  }

  return `
    CREATE TABLE IF NOT EXISTS guild_module_settings (
      guild_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (guild_id, module_id)
    );
  `;
}

export function guildModuleSettingsUpsert(dialect: SqlDialect): string {
  if (dialect === 'mysql') {
    return `
      INSERT INTO guild_module_settings (guild_id, module_id, enabled)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)
    `;
  }

  return `
    INSERT INTO guild_module_settings (guild_id, module_id, enabled)
    VALUES (?, ?, ?)
    ON CONFLICT (guild_id, module_id) DO UPDATE SET enabled = excluded.enabled
  `;
}

export function enabledToDb(dialect: SqlDialect, enabled: boolean): number {
  return enabled ? 1 : 0;
}

export function enabledFromDb(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}
