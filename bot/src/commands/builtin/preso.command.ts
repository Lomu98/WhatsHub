import { completeItemByPosition, getItems } from '../../services/lists.service';
import { escapeWa, normalizeListName, prettifyListName } from '../../utils/text';
import type { Command } from '../types';

export const presoCommand: Command = {
  name: 'preso',
  aliases: ['fatto', 'done'],
  usage: '!preso <lista> <numero>',
  description: 'Segna come completato l\'elemento numero N della lista',
  category: 'liste',

  async execute({ args, reply, chatId, authorId, prefix }) {
    const [listNameRaw, positionRaw] = args;

    if (!listNameRaw || !positionRaw) {
      await reply(
        `⚠️ Sintassi: *${prefix}preso <lista> <numero>*\n` +
          `Esempio: _${prefix}preso spesa 2_ (il numero lo trovi con ${prefix}lista)`,
      );
      return;
    }

    const position = Number.parseInt(positionRaw, 10);
    if (!Number.isInteger(position) || position < 1) {
      await reply(`⚠️ "${escapeWa(positionRaw)}" non è un numero valido.`);
      return;
    }

    const listKey = normalizeListName(listNameRaw);
    const item = await completeItemByPosition({
      groupId: chatId,
      listName: listKey,
      position,
      completedBy: authorId,
    });

    if (!item) {
      const items = await getItems(chatId, listKey);
      await reply(
        items.length === 0
          ? `📭 La lista *${prettifyListName(listKey)}* non esiste o è vuota.`
          : `⚠️ Nella lista *${prettifyListName(listKey)}* ci sono solo ${items.length} elementi.`,
      );
      return;
    }

    const remaining = (await getItems(chatId, listKey)).filter((entry) => !entry.completed).length;
    await reply(
      `✅ Preso: ${escapeWa(item.name)}\n` +
        (remaining > 0
          ? `_Mancano ancora ${remaining} elementi in ${prettifyListName(listKey)}_`
          : `🎉 *${prettifyListName(listKey)}* completata!`),
    );
  },
};
