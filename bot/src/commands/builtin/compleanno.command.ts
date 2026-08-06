import { upsertBirthday } from '../../services/birthdays.service';
import { formatBirthdayDate, parseBirthdayDate } from '../../utils/date';
import { escapeWa, phoneFromId } from '../../utils/text';
import type { Command } from '../types';

export const compleannoCommand: Command = {
  name: 'compleanno',
  aliases: ['setbday'],
  usage: '!compleanno [@utente] GG/MM',
  description:
    'Registra un compleanno: nei gruppi menzionando la persona, in privato il tuo',
  category: 'calendario',

  async execute({ message, args, reply, chatId, authorId, authorName, isGroup, prefix }) {
    // La data è sempre l'ultimo token: le menzioni possono contenere spazi.
    const dateToken = args[args.length - 1];
    const date = dateToken ? parseBirthdayDate(dateToken) : null;

    if (!date) {
      await reply(
        isGroup
          ? `⚠️ Sintassi: *${prefix}compleanno @utente GG/MM*\n` +
              `Esempio: _${prefix}compleanno @Marco 25/12_`
          : `⚠️ Sintassi: *${prefix}compleanno GG/MM*\n` +
              `Esempio: _${prefix}compleanno 25/12_ (registra il tuo compleanno)`,
      );
      return;
    }

    const mentions = await message.getMentions();
    const mentioned = mentions[0];

    // Nei gruppi serve sempre una menzione esplicita: "il compleanno" senza
    // destinatario sarebbe ambiguo con più persone in chat.
    if (isGroup && !mentioned) {
      await reply(
        `⚠️ Devi menzionare la persona.\n` +
          `Esempio: _${prefix}compleanno @Marco 25/12_`,
      );
      return;
    }

    // In privato non esistono menzioni: senza destinatario esplicito il
    // comando si applica a chi scrive.
    const targetId = mentioned ? mentioned.id._serialized : authorId;
    const targetName = mentioned
      ? mentioned.pushname || mentioned.name || mentioned.shortName || phoneFromId(targetId)
      : authorName;

    await upsertBirthday({
      userId: targetId,
      name: targetName,
      date,
      addedBy: authorId,
      groupId: chatId,
    });

    const isSelf = targetId === authorId;
    await reply(
      `🎂 Compleanno salvato: *${escapeWa(targetName)}* — ${formatBirthdayDate(date)}\n` +
        (isGroup
          ? `_Riceverete gli auguri automatici quel giorno alle 09:00._`
          : isSelf
            ? `_Ricorda: gli auguri automatici partono solo nei gruppi con le notifiche attive._`
            : `_Registrato._`),
    );
  },
};
