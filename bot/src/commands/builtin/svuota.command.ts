import { clearList } from '../../services/lists.service';
import { normalizeListName, prettifyListName } from '../../utils/text';
import type { Command } from '../types';

export const svuotaCommand: Command = {
  name: 'svuota',
  aliases: ['clear', 'reset'],
  usage: '!svuota <lista>',
  description: 'Svuota completamente una lista',
  category: 'liste',

  async execute({ args, reply, chatId, prefix }) {
    const listNameRaw = args[0];

    if (!listNameRaw) {
      await reply(
        `⚠️ Sintassi: *${prefix}svuota <lista>*\nEsempio: _${prefix}svuota spesa_`,
      );
      return;
    }

    const listKey = normalizeListName(listNameRaw);
    const removed = await clearList(chatId, listKey);

    if (removed === 0) {
      await reply(`📭 La lista *${prettifyListName(listKey)}* era già vuota.`);
      return;
    }

    await reply(
      `🧹 Lista *${prettifyListName(listKey)}* svuotata — rimossi ${removed} element${removed === 1 ? 'o' : 'i'}.`,
    );
  },
};
