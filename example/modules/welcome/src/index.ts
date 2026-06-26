import { Events } from 'discord.js';
import type { Module } from 'modular-discord';

/**
 * Демо: ModuleListeners (on / once), lifecycle-хуки onEnable / onDisable / onUnload.
 */
const module: Module = {
  meta: {
    id: 'welcome',
    name: 'Welcome',
    description: 'Приветствует новых участников через Discord-события',
    defaultEnabled: true,
  },

  onLoad(ctx) {
    ctx.listeners.on(
      Events.GuildMemberAdd,
      async (member) => {
        const channel = member.guild.systemChannel;
        if (!channel?.isTextBased()) return;
        await channel.send(`Добро пожаловать, ${member}! Модуль **welcome** активен на сервере.`);
      },
      { checkEnabled: true, guildOnly: true }
    );

    ctx.listeners.once(
      Events.MessageCreate,
      async (message) => {
        if (message.author.bot || !message.guild) return;
        if (message.content !== '!welcome-once') return;
        await message.reply('Сработал `listeners.once` — повторно не вызовется.');
      },
      { checkEnabled: false, guildOnly: true }
    );

    console.log('[welcome] onLoad: слушатели зарегистрированы');
  },

  async onEnable(_ctx, guildId) {
    console.log(`[welcome] onEnable: модуль включён на сервере ${guildId}`);
  },

  async onDisable(_ctx, guildId) {
    console.log(`[welcome] onDisable: модуль выключен на сервере ${guildId}`);
  },

  onUnload() {
    console.log('[welcome] onUnload: listeners.dispose() вызывается ядром автоматически');
  },
};

export default module;
