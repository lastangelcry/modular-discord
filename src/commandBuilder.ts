import { SlashCommandBuilder, type SlashCommandSubcommandBuilder } from 'discord.js';
import type { CommandDefinition, CommandOptionDefinition } from './types.js';

function addOptionsToSubcommand(sub: SlashCommandSubcommandBuilder, options: CommandOptionDefinition[]): void {
  for (const opt of options) {
    if (opt.type === 'string') {
      sub.addStringOption((o) => {
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false);
        if (opt.choices?.length) {
          o.addChoices(...opt.choices.map((c) => ({ name: c.name, value: c.value })));
        }
        return o;
      });
    } else if (opt.type === 'boolean') {
      sub.addBooleanOption((o) =>
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false)
      );
    } else if (opt.type === 'integer') {
      sub.addIntegerOption((o) =>
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false)
      );
    } else if (opt.type === 'user') {
      sub.addUserOption((o) =>
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false)
      );
    }
  }
}

function addOptionsToCommand(builder: SlashCommandBuilder, options: CommandOptionDefinition[]): void {
  for (const opt of options) {
    if (opt.type === 'string') {
      builder.addStringOption((o) => {
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false);
        if (opt.choices?.length) {
          o.addChoices(...opt.choices.map((c) => ({ name: c.name, value: c.value })));
        }
        return o;
      });
    } else if (opt.type === 'boolean') {
      builder.addBooleanOption((o) =>
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false)
      );
    } else if (opt.type === 'integer') {
      builder.addIntegerOption((o) =>
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false)
      );
    } else if (opt.type === 'user') {
      builder.addUserOption((o) =>
        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false)
      );
    }
  }
}

export function buildSlashCommand(def: CommandDefinition) {
  const builder = new SlashCommandBuilder().setName(def.name).setDescription(def.description);

  if (def.subcommands?.length) {
    for (const sub of def.subcommands) {
      builder.addSubcommand((s) => {
        s.setName(sub.name).setDescription(sub.description);
        addOptionsToSubcommand(s, sub.options ?? []);
        return s;
      });
    }
  } else {
    addOptionsToCommand(builder, def.options ?? []);
  }

  return builder.toJSON();
}
