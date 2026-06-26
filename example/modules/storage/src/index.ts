import { isDocumentStore, isSqlStore, type CommandDefinition, type Module } from 'modular-discord';

/**
 * Демо: isSqlStore / isDocumentStore — один модуль для SQL и MongoDB.
 */
const module: Module = {
  meta: {
    id: 'storage',
    name: 'Storage',
    description: 'Универсальное хранилище (SQL или MongoDB)',
    defaultEnabled: true,
  },

  async onLoad(ctx) {
    if (isSqlStore(ctx.db)) {
      const table = ctx.db.table('notes');
      await ctx.db.exec(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          text TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      console.log('[storage] onLoad: SQL-режим, таблица', table);
      return;
    }

    if (isDocumentStore(ctx.db)) {
      console.log('[storage] onLoad: MongoDB-режим, коллекция', ctx.db.collection('notes'));
      return;
    }

    console.warn('[storage] onLoad: неизвестный тип хранилища');
  },

  registerCommands(): CommandDefinition[] {
    return [
      {
        name: 'storage',
        description: 'Заметки (SQL или MongoDB)',
        subcommands: [
          {
            name: 'save',
            description: 'Сохранить заметку',
            options: [
              {
                name: 'text',
                description: 'Текст заметки',
                type: 'string',
                required: true,
              },
            ],
          },
          { name: 'list', description: 'Последние 5 заметок' },
        ],
      },
    ];
  },

  async handleInteraction(ctx, interaction) {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'storage') {
      return false;
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'Только на сервере.', ephemeral: true });
      return true;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'save') {
      const text = interaction.options.getString('text', true);
      await saveNote(ctx, guildId, interaction.user.id, text);
      await interaction.reply({ content: 'Заметка сохранена.', ephemeral: true });
      return true;
    }

    if (sub === 'list') {
      const notes = await listNotes(ctx, guildId);
      const body =
        notes.length > 0
          ? notes.map((n, i) => `${i + 1}. ${n.text}`).join('\n')
          : 'Заметок пока нет.';
      await interaction.reply({ content: body, ephemeral: true });
      return true;
    }

    return false;
  },
};

interface Note {
  text: string;
}

async function saveNote(
  ctx: import('modular-discord').ModuleContext,
  guildId: string,
  authorId: string,
  text: string
): Promise<void> {
  if (isSqlStore(ctx.db)) {
    const table = ctx.db.table('notes');
    await ctx.db.run(
      `INSERT INTO ${table} (guild_id, author_id, text) VALUES (?, ?, ?)`,
      [guildId, authorId, text]
    );
    return;
  }

  if (isDocumentStore(ctx.db)) {
    await ctx.db.insertOne('notes', {
      guild_id: guildId,
      author_id: authorId,
      text,
      created_at: new Date().toISOString(),
    });
  }
}

async function listNotes(
  ctx: import('modular-discord').ModuleContext,
  guildId: string
): Promise<Note[]> {
  if (isSqlStore(ctx.db)) {
    const table = ctx.db.table('notes');
    return ctx.db.all<Note>(
      `SELECT text FROM ${table} WHERE guild_id = ? ORDER BY id DESC LIMIT 5`,
      [guildId]
    );
  }

  if (isDocumentStore(ctx.db)) {
    const docs = await ctx.db.find<{ text: string }>('notes', { guild_id: guildId });
    return docs.slice(-5).reverse();
  }

  return [];
}

export default module;
