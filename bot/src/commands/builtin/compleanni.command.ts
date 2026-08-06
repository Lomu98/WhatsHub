import { getUpcomingBirthdays } from '../../services/birthdays.service';
import { formatBirthdayDate, humanizeDaysLeft } from '../../utils/date';
import { escapeWa } from '../../utils/text';
import type { Command } from '../types';

export const compleanniCommand: Command = {
  name: 'compleanni',
  aliases: ['bday', 'birthdays'],
  usage: '!compleanni',
  description: 'Mostra i prossimi compleanni del gruppo',
  category: 'calendario',

  async execute({ reply, prefix }) {
    const birthdays = await getUpcomingBirthdays(10);

    if (birthdays.length === 0) {
      await reply(
        `🎂 Nessun compleanno registrato.\n` +
          `Aggiungine uno con *${prefix}compleanno @utente 25/12*`,
      );
      return;
    }

    const lines = birthdays.map((birthday) => {
      const when = formatBirthdayDate(birthday.date);
      const left = humanizeDaysLeft(birthday.daysLeft);
      const highlight = birthday.daysLeft === 0 ? '🎉' : '🎂';
      return `${highlight} *${escapeWa(birthday.name)}* — ${when} _(${left})_`;
    });

    await reply(`🎂 *Prossimi compleanni*\n\n${lines.join('\n')}`);
  },
};
