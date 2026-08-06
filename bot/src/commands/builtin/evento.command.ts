import { createEvent } from '../../services/events.service';
import { formatEventDate, parseEventDateTime } from '../../utils/date';
import { escapeWa } from '../../utils/text';
import type { Command } from '../types';

/** Messaggio di sintassi, riusato sia per l'help esplicito che per gli errori. */
function syntaxHelp(prefix: string): string {
  return (
    `📌 *${prefix}evento <nome> | <inizio> | [<fine>] | [<descrizione>]*\n\n` +
    `Separa i campi con *|*. Formato date: *GG/MM[/AAAA] [HH:MM]*\n` +
    `(anno e ora sono facoltativi: senza anno usa quello corrente, senza ora usa mezzanotte).\n\n` +
    `Esempi:\n` +
    `_${prefix}evento Cena di Natale | 25/12 20:00_\n` +
    `_${prefix}evento Weekend al mare | 25/07 | 27/07 | Portare la crema solare_\n\n` +
    `L'evento sarà visibile solo qui, con ${prefix}eventi.`
  );
}

export const eventoCommand: Command = {
  name: 'evento',
  aliases: ['aggiungievento', 'newevent'],
  usage: '!evento <nome> | <inizio> | [<fine>] | [<descrizione>]',
  description: 'Crea un evento visibile solo in questa chat',
  category: 'calendario',

  async execute({ rawArgs, reply, chatId, authorId, authorName, prefix }) {
    if (!rawArgs.trim()) {
      await reply(syntaxHelp(prefix));
      return;
    }

    // "|" separa i campi: a differenza degli spazi, non è ambiguo con nomi e
    // descrizioni che contengono più parole.
    const segments = rawArgs.split('|').map((segment) => segment.trim());
    const [title, startRaw, thirdRaw, ...rest] = segments;

    if (!title || !startRaw) {
      await reply(`⚠️ Mancano nome e/o data di inizio.\n\n${syntaxHelp(prefix)}`);
      return;
    }

    const startDate = parseEventDateTime(startRaw);
    if (startDate === null) {
      await reply(
        `⚠️ Data di inizio non valida: "${escapeWa(startRaw)}".\n` +
          `Formato: *GG/MM[/AAAA] [HH:MM]*`,
      );
      return;
    }

    // Il terzo campo è ambiguo quando manca il quarto: se è una data valida è
    // la fine dell'evento, altrimenti è già la descrizione.
    let endDate: number | null = null;
    let description = '';

    if (thirdRaw !== undefined && thirdRaw !== '') {
      const parsedEnd = parseEventDateTime(thirdRaw);
      if (parsedEnd !== null) {
        endDate = parsedEnd;
        description = rest.join('|').trim();
      } else {
        description = [thirdRaw, ...rest].join('|').trim();
      }
    }

    if (endDate !== null && endDate < startDate) {
      await reply('⚠️ La data di fine non può essere prima della data di inizio.');
      return;
    }

    const event = await createEvent({
      groupId: chatId,
      title,
      startDate,
      endDate,
      description,
      createdBy: authorId,
      createdByName: authorName,
    });

    const range = event.endDate
      ? `${formatEventDate(event.startDate)} → ${formatEventDate(event.endDate)}`
      : formatEventDate(event.startDate);

    await reply(
      `📌 Evento creato: *${escapeWa(event.title)}*\n` +
        `🗓️ ${range}` +
        (event.description ? `\n_${escapeWa(event.description)}_` : '') +
        `\n\n_Visibile solo qui, con ${prefix}eventi._`,
    );
  },
};
