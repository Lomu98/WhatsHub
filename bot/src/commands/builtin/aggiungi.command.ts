import { addItem } from '../../services/lists.service';
import { escapeWa, normalizeListName, prettifyListName } from '../../utils/text';
import type { Command } from '../types';

export const aggiungiCommand: Command = {
  name: 'aggiungi',
  aliases: ['add'],
  usage: '!aggiungi <lista> <oggetto>',
  description: 'Aggiunge un oggetto a una lista (di gruppo, o personale in privato)',
  category: 'liste',

  async execute({ args, reply, chatId, authorId, authorName, prefix }) {
    const [listNameRaw, ...itemParts] = args;
    const itemName = itemParts.join(' ').trim();

    if (!listNameRaw || !itemName) {
      await reply(
        `⚠️ Sintassi: *${prefix}aggiungi <lista> <oggetto>*\n` +
          `Esempio: _${prefix}aggiungi spesa 2 litri di latte_`,
      );
      return;
    }

    const listKey = normalizeListName(listNameRaw);
    if (!listKey) {
      await reply('⚠️ Il nome della lista può contenere solo lettere, numeri e trattini.');
      return;
    }

    const item = await addItem({
      groupId: chatId,
      listName: listKey,
      name: itemName,
      addedBy: authorId,
      addedByName: authorName,
    });

    await reply(
      `✅ Aggiunto a *${prettifyListName(listKey)}*: ${escapeWa(item.name)}\n` +
        `_Vedi tutto con ${prefix}lista ${listKey}_`,
    );
  },
};
