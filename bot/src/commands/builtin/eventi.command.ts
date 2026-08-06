import { getUpcomingEvents } from '../../services/events.service';
import { formatEventDate } from '../../utils/date';
import { escapeWa } from '../../utils/text';
import type { Command } from '../types';

export const eventiCommand: Command = {
  name: 'eventi',
  aliases: ['events', 'appuntamenti'],
  usage: '!eventi',
  description: 'Mostra i prossimi appuntamenti creati in questa chat',
  category: 'calendario',

  async execute({ reply, chatId, prefix }) {
    const events = await getUpcomingEvents(chatId, 10);

    if (events.length === 0) {
      await reply(
        `📅 Nessun evento in programma qui.\n_Creane uno con ${prefix}evento — scrivi solo ${prefix}evento per la guida._`,
      );
      return;
    }

    const lines = events.map((event) => {
      const range = event.endDate
        ? `${formatEventDate(event.startDate)} → ${formatEventDate(event.endDate)}`
        : formatEventDate(event.startDate);
      const description = event.description?.trim()
        ? `\n   _${escapeWa(event.description.trim())}_`
        : '';
      return `📌 *${escapeWa(event.title)}*\n   ${range}${description}`;
    });

    await reply(`📅 *Prossimi eventi qui*\n\n${lines.join('\n\n')}`);
  },
};
