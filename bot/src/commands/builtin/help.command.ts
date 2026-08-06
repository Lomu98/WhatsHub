import { env } from '../../config/env';
import { listEnabledCustomCommands } from '../../services/customCommands.service';
import { escapeWa } from '../../utils/text';
import type { Command } from '../types';
import { getBuiltinCommands } from '../registry';

const CATEGORY_TITLES: Record<Command['category'], string> = {
  liste: '📋 Liste',
  calendario: '🎂 Calendario',
  citazioni: '💬 Citazioni',
  utility: '⚙️ Utility',
};

export const helpCommand: Command = {
  name: 'help',
  aliases: ['hub', 'aiuto', 'comandi'],
  usage: '!help',
  description: 'Mostra questa guida',
  category: 'utility',

  async execute({ reply, prefix }) {
    const sections: string[] = [];

    for (const category of ['liste', 'calendario', 'citazioni', 'utility'] as const) {
      const commands = getBuiltinCommands().filter((command) => command.category === category);
      if (commands.length === 0) continue;

      const lines = commands.map(
        (command) => `• *${command.usage.replace(/^!/, prefix)}*\n  _${command.description}_`,
      );
      sections.push(`${CATEGORY_TITLES[category]}\n${lines.join('\n')}`);
    }

    const custom = listEnabledCustomCommands();
    if (custom.length > 0) {
      const lines = custom.map((command) => {
        const trigger = command.trigger.startsWith(prefix)
          ? command.trigger
          : `${prefix}${command.trigger}`;
        const description = command.description?.trim()
          ? `\n  _${escapeWa(command.description.trim())}_`
          : '';
        return `• *${escapeWa(trigger)}*${description}`;
      });
      sections.push(`✨ Comandi custom\n${lines.join('\n')}`);
    }

    await reply(
      `🤖 *${env.bot.name}* — guida ai comandi\n\n` +
        `${sections.join('\n\n')}\n\n` +
        `_Gestisci tutto dalla dashboard WhatsHub._`,
    );
  },
};
