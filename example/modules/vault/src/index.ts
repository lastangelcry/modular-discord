import type { CommandDefinition, Module } from 'modular-discord';

/**
 * Демо: defaultEnabled: false — модуль выключен по умолчанию,
 * включается через /settings module.
 */
const module: Module = {
  meta: {
    id: 'vault',
    name: 'Vault',
    description: 'Секретный модуль (выключен по умолчанию)',
    defaultEnabled: false,
  },

  async onLoad(ctx) {
    const table = ctx.db.table('secrets');
    await ctx.db.exec(`
      CREATE TABLE IF NOT EXISTS ${table} (
        guild_id TEXT PRIMARY KEY,
        secret TEXT NOT NULL
      )
    `);
    console.log('[vault] onLoad: готов, но на серверах выключен до /settings');
  },

  registerCommands(): CommandDefinition[] {
    return [
      {
        name: 'vault',
        description: 'Секретное хранилище (только когда модуль включён)',
        subcommands: [
          {
            name: 'set',
            description: 'Сохранить секрет',
            options: [
              {
                name: 'text',
                description: 'Секретная строка',
                type: 'string',
                required: true,
              },
            ],
          },
          { name: 'get', description: 'Показать секрет сервера' },
        ],
      },
    ];
  },

  async handleInteraction(ctx, interaction) {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'vault') {
      return false;
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'Только на сервере.', ephemeral: true });
      return true;
    }

    const table = ctx.db.table('secrets');
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const text = interaction.options.getString('text', true);
      await ctx.db.run(
        `INSERT INTO ${table} (guild_id, secret) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET secret = excluded.secret`,
        [guildId, text]
      );
      await interaction.reply({ content: 'Секрет сохранён.', ephemeral: true });
      return true;
    }

    if (sub === 'get') {
      const row = await ctx.db.get<{ secret: string }>(
        `SELECT secret FROM ${table} WHERE guild_id = ?`,
        [guildId]
      );
      await interaction.reply({
        content: row ? `Секрет: ||${row.secret}||` : 'Секрет не задан.',
        ephemeral: true,
      });
      return true;
    }

    return false;
  },

  async onEnable(_ctx, guildId) {
    console.log(`[vault] onEnable: секреты доступны на сервере ${guildId}`);
  },

  async onDisable(_ctx, guildId) {
    console.log(`[vault] onDisable: секреты скрыты на сервере ${guildId}`);
  },
};

export default module;
