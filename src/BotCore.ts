import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { buildSlashCommand } from './commandBuilder.js';
import { Database } from './Database.js';
import { discoverModules } from './ModuleLoader.js';
import { ModuleListeners } from './ModuleListeners.js';
import type { BotConfig, LoadedModule, Module, ModuleContext } from './types.js';

const DEFAULT_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

export class BotCore {
  readonly client: Client;
  readonly db: Database;

  private readonly config: BotConfig;
  private readonly modules = new Collection<string, LoadedModule>();
  private contexts = new Collection<string, ModuleContext>();

  constructor(config: BotConfig, client?: Client) {
    this.config = config;
    this.db = new Database({ path: config.databasePath });
    this.client = client ?? new Client({ intents: DEFAULT_INTENTS });
    this.initCoreSchema();
    this.bindEvents();
  }

  private initCoreSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guild_module_settings (
        guild_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (guild_id, module_id)
      );
    `);
  }

  private bindEvents(): void {
    this.client.once(Events.ClientReady, (c) => {
      console.log(`[core] Logged in as ${c.user.tag}`);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          if (interaction.commandName === 'settings') {
            await this.handleSettingsCommand(interaction);
            return;
          }
        }

        for (const loaded of this.modules.values()) {
          if (!this.isModuleEnabled(loaded.meta.id, interaction.guildId)) continue;
          const ctx = this.contexts.get(loaded.meta.id);
          if (!ctx || !loaded.instance.handleInteraction) continue;

          const handled = await loaded.instance.handleInteraction(ctx, interaction);
          if (handled) return;
        }
      } catch (err) {
        console.error('[core] Interaction error:', err);
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Произошла ошибка.', ephemeral: true }).catch(() => {});
        }
      }
    });
  }

  async start(): Promise<void> {
    await mkdir(dirname(this.config.databasePath), { recursive: true });

    const moduleCachePath =
      this.config.moduleCachePath ?? join(dirname(this.config.databasePath), '.module-cache');
    const discovered = await discoverModules(this.config.modulesPath, moduleCachePath);

    for (const loaded of discovered) {
      this.modules.set(loaded.meta.id, loaded);
      const ctx = this.createContext(loaded.instance);
      this.contexts.set(loaded.meta.id, ctx);

      if (loaded.instance.onLoad) {
        await loaded.instance.onLoad(ctx);
      }
    }

    console.log(`[core] Loaded ${this.modules.size} module(s): ${[...this.modules.keys()].join(', ') || 'none'}`);

    await this.registerSlashCommands();
    await this.client.login(this.config.token);
  }

  async stop(): Promise<void> {
    for (const loaded of this.modules.values()) {
      const ctx = this.contexts.get(loaded.meta.id);
      if (!ctx) continue;
      ctx.listeners.dispose();
      if (loaded.instance.onUnload) {
        await loaded.instance.onUnload(ctx);
      }
    }
    this.client.destroy();
    this.db.close();
  }

  getModule(id: string): LoadedModule | undefined {
    return this.modules.get(id);
  }

  listModules(): LoadedModule[] {
    return [...this.modules.values()];
  }

  isModuleEnabled(moduleId: string, guildId: string | null): boolean {
    if (!guildId) return false;

    const row = this.db.get<{ enabled: number }>(
      `SELECT enabled FROM guild_module_settings WHERE guild_id = ? AND module_id = ?`,
      guildId,
      moduleId
    );

    if (row !== undefined) return row.enabled === 1;

    const mod = this.modules.get(moduleId);
    return mod?.meta.defaultEnabled !== false;
  }

  async setModuleEnabled(moduleId: string, guildId: string, enabled: boolean): Promise<void> {
    const mod = this.modules.get(moduleId);
    if (!mod) throw new Error(`Module "${moduleId}" not found`);

    this.db.run(
      `INSERT INTO guild_module_settings (guild_id, module_id, enabled)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id, module_id) DO UPDATE SET enabled = excluded.enabled`,
      guildId,
      moduleId,
      enabled ? 1 : 0
    );

    const ctx = this.contexts.get(moduleId);
    if (!ctx) return;

    if (enabled && mod.instance.onEnable) {
      await mod.instance.onEnable(ctx, guildId);
    } else if (!enabled && mod.instance.onDisable) {
      await mod.instance.onDisable(ctx, guildId);
    }
  }

  private createContext(mod: Module): ModuleContext {
    const isEnabled = (guildId: string) => this.isModuleEnabled(mod.meta.id, guildId);
    const listeners = new ModuleListeners(this.client, isEnabled, mod.meta.id);

    return {
      client: this.client,
      db: this.db.forModule(mod.meta.id),
      isEnabled,
      listeners,
    };
  }

  private async registerSlashCommands(): Promise<void> {
    const commands = [this.buildSettingsCommand()];

    for (const loaded of this.modules.values()) {
      const ctx = this.contexts.get(loaded.meta.id)!;
      const defs = loaded.instance.registerCommands?.(ctx) ?? [];
      for (const def of defs) {
        commands.push(buildSlashCommand(def));
      }
    }

    const rest = new REST({ version: '10' }).setToken(this.config.token);
    await rest.put(Routes.applicationCommands(this.config.clientId), { body: commands });
    console.log(`[core] Registered ${commands.length} slash command(s)`);
  }

  private buildSettingsCommand() {
    const moduleChoices = this.listModules().map((m) => ({
      name: m.meta.name,
      value: m.meta.id,
    }));

    return buildSlashCommand({
      name: 'settings',
      description: 'Настройки бота: включение и отключение модулей',
      subcommands: [
        { name: 'list', description: 'Показать список модулей и их статус' },
        {
          name: 'module',
          description: 'Включить или отключить модуль',
          options: [
            {
              name: 'name',
              description: 'Модуль',
              type: 'string',
              required: true,
              choices: moduleChoices,
            },
            {
              name: 'enabled',
              description: 'Включить (true) или отключить (false)',
              type: 'boolean',
              required: true,
            },
          ],
        },
      ],
    });
  }

  private async handleSettingsCommand(
    interaction: import('discord.js').ChatInputCommandInteraction
  ): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'Команда доступна только на сервере.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const lines = this.listModules().map((m) => {
        const on = this.isModuleEnabled(m.meta.id, interaction.guildId!);
        return `**${m.meta.name}** (\`${m.meta.id}\`) — ${on ? '✅ включён' : '❌ выключен'}\n> ${m.meta.description}`;
      });

      await interaction.reply({
        content: lines.length ? lines.join('\n\n') : 'Модули не загружены.',
        ephemeral: true,
      });
      return;
    }

    if (sub === 'module') {
      const moduleId = interaction.options.getString('name', true);
      const enabled = interaction.options.getBoolean('enabled', true);

      await this.setModuleEnabled(moduleId, interaction.guildId, enabled);

      const mod = this.modules.get(moduleId)!;
      await interaction.reply({
        content: `Модуль **${mod.meta.name}** ${enabled ? 'включён' : 'отключён'}.`,
        ephemeral: true,
      });
    }
  }
}
