import type { CommandDefinition, Module } from 'modular-discord';

/**
 * Исходник для .pak-модуля. Собирается командой: npm run pack:greeter
 * Результат: modules/greeter.pak (приоритет над папкой с тем же id)
 */
const module: Module = {
  meta: {
    id: 'greeter',
    name: 'Greeter',
    description: 'Загружается из .pak-архива',
    defaultEnabled: true,
  },

  registerCommands(): CommandDefinition[] {
    return [
      {
        name: 'hello',
        description: 'Приветствие из .pak-модуля',
        options: [
          {
            name: 'name',
            description: 'Ваше имя',
            type: 'string',
            required: false,
          },
        ],
      },
    ];
  },

  async handleInteraction(_ctx, interaction) {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'hello') {
      return false;
    }

    const name = interaction.options.getString('name') ?? interaction.user.username;
    await interaction.reply(`Привет, **${name}**! Модуль загружен из \`.pak\`.`);
    return true;
  },

  onLoad() {
    console.log('[greeter] onLoad: модуль из .pak');
  },
};

export default module;
