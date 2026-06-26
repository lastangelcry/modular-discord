import type { Client, Collection, Interaction } from 'discord.js';
import type { ModuleDataStore } from './database/types.js';
import type { ModuleListeners } from './ModuleListeners.js';
import type { DatabaseConfig } from './database/types.js';

export interface BotConfig {
  token: string;
  clientId: string;
  modulesPath: string;
  /** Database backend (recommended) */
  database?: DatabaseConfig;
  /**
   * SQLite file path — shorthand for `{ type: 'sqlite', path }`.
   * @deprecated Prefer `database`.
   */
  databasePath?: string;
  /** Data directory for module cache and SQLite parent folder; default: cwd */
  dataPath?: string;
  /** Кэш распакованных .pak; по умолчанию data/.module-cache */
  moduleCachePath?: string;
}

export interface ModuleMeta {
  id: string;
  name: string;
  description: string;
  defaultEnabled?: boolean;
}

export interface ModuleContext {
  client: Client;
  db: ModuleDataStore;
  isEnabled: (guildId: string) => boolean;
  /** Слушатели Discord-событий с автопроверкой enabled и cleanup */
  listeners: ModuleListeners;
}

export interface Module {
  meta: ModuleMeta;
  onLoad?: (ctx: ModuleContext) => void | Promise<void>;
  onUnload?: (ctx: ModuleContext) => void | Promise<void>;
  onEnable?: (ctx: ModuleContext, guildId: string) => void | Promise<void>;
  onDisable?: (ctx: ModuleContext, guildId: string) => void | Promise<void>;
  registerCommands?: (ctx: ModuleContext) => CommandDefinition[];
  handleInteraction?: (
    ctx: ModuleContext,
    interaction: Interaction
  ) => boolean | void | Promise<boolean | void>;
}

export interface CommandOptionDefinition {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'integer' | 'user';
  required?: boolean;
  choices?: { name: string; value: string }[];
}

export interface SubcommandDefinition {
  name: string;
  description: string;
  options?: CommandOptionDefinition[];
}

export interface CommandDefinition {
  name: string;
  description: string;
  options?: CommandOptionDefinition[];
  subcommands?: SubcommandDefinition[];
}

export type LoadedModule = {
  meta: ModuleMeta;
  instance: Module;
  path: string;
};

export type ModuleRegistry = Collection<string, LoadedModule>;
