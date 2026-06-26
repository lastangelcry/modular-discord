import type { CommandDefinition, Module, ModuleContext } from 'modular-discord';

/**
 * Демо: registerCommands (subcommands + все типы опций),
 * handleInteraction, SQL (exec / run / get / all / transaction), table().
 */
const module: Module = {
  meta: {
    id: 'stats',
    name: 'Stats',
    description: 'Счётчик сообщений и slash-команды со всеми типами опций',
    defaultEnabled: true,
  },

  async onLoad(ctx) {
    const table = ctx.db.table('counters');
    await ctx.db.exec(`
      CREATE TABLE IF NOT EXISTS ${table} (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
      )
    `);
    console.log('[stats] onLoad: таблица', table);
  },

  registerCommands(_ctx): CommandDefinition[] {
    return [
      {
        name: 'stats',
        description: 'Статистика и демо slash-команд',
        subcommands: [
          { name: 'ping', description: 'Проверка отклика бота' },
          {
            name: 'add',
            description: 'Добавить к счётчику (integer option)',
            options: [
              {
                name: 'amount',
                description: 'Сколько добавить',
                type: 'integer',
                required: true,
              },
            ],
          },
          {
            name: 'mention',
            description: 'Упомянуть пользователя (user option)',
            options: [
              {
                name: 'target',
                description: 'Кого упомянуть',
                type: 'user',
                required: true,
              },
            ],
          },
          {
            name: 'echo',
            description: 'Эхо с choices (string option)',
            options: [
              {
                name: 'phrase',
                description: 'Фраза',
                type: 'string',
                required: true,
                choices: [
                  { name: 'Привет', value: 'hello' },
                  { name: 'Пока', value: 'bye' },
                ],
              },
            ],
          },
          {
            name: 'me',
            description: 'Показать ваш счётчик из SQLite',
          },
        ],
      },
    ];
  },

  async handleInteraction(ctx, interaction) {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'stats') {
      return false;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'ping') {
      await interaction.reply({ content: 'Pong!', ephemeral: true });
      return true;
    }

    if (sub === 'add') {
      const amount = interaction.options.getInteger('amount', true);
      const guildId = interaction.guildId!;
      const userId = interaction.user.id;

      await incrementCounter(ctx, guildId, userId, amount);
      await interaction.reply({
        content: `+${amount} к счётчику. Текущее значение: ${await getCounter(ctx, guildId, userId)}`,
        ephemeral: true,
      });
      return true;
    }

    if (sub === 'mention') {
      const target = interaction.options.getUser('target', true);
      await interaction.reply(`Демо user option: ${target.tag}`);
      return true;
    }

    if (sub === 'echo') {
      const phrase = interaction.options.getString('phrase', true);
      const labels: Record<string, string> = { hello: 'Привет!', bye: 'Пока!' };
      await interaction.reply(labels[phrase] ?? phrase);
      return true;
    }

    if (sub === 'me') {
      const guildId = interaction.guildId!;
      const userId = interaction.user.id;
      const count = await getCounter(ctx, guildId, userId);
      await interaction.reply({ content: `Ваш счётчик: **${count}**`, ephemeral: true });
      return true;
    }

    return false;
  },
};

async function incrementCounter(
  ctx: ModuleContext,
  guildId: string,
  userId: string,
  amount: number
): Promise<void> {
  const table = ctx.db.table('counters');

  await ctx.db.transaction(async () => {
    const row = await ctx.db.get<{ count: number }>(
      `SELECT count FROM ${table} WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId]
    );

    if (row) {
      await ctx.db.run(
        `UPDATE ${table} SET count = count + ? WHERE guild_id = ? AND user_id = ?`,
        [amount, guildId, userId]
      );
    } else {
      await ctx.db.run(
        `INSERT INTO ${table} (guild_id, user_id, count) VALUES (?, ?, ?)`,
        [guildId, userId, amount]
      );
    }
  });
}

async function getCounter(ctx: ModuleContext, guildId: string, userId: string): Promise<number> {
  const table = ctx.db.table('counters');
  const row = await ctx.db.get<{ count: number }>(
    `SELECT count FROM ${table} WHERE guild_id = ? AND user_id = ?`,
    [guildId, userId]
  );
  return row?.count ?? 0;
}

export default module;
