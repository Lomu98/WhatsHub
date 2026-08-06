import { getItems, getListNames } from '../../services/lists.service';
import { escapeWa, normalizeListName, prettifyListName } from '../../utils/text';
import type { Command } from '../types';

export const listaCommand: Command = {
  name: 'lista',
  aliases: ['list', 'liste'],
  usage: '!lista <nome_lista>',
  description: 'Mostra il contenuto di una lista (senza argomenti elenca le liste esistenti)',
  category: 'liste',

  async execute({ args, reply, chatId, isGroup, prefix }) {
    const listNameRaw = args[0];

    // Senza argomenti: elenco delle liste disponibili in questa chat.
    if (!listNameRaw) {
      const names = await getListNames(chatId);
      if (names.length === 0) {
        await reply(
          `📭 Non c'è ancora nessuna lista ${isGroup ? 'in questo gruppo' : 'qui'}.\n` +
            `Creane una con *${prefix}aggiungi spesa pane*`,
        );
        return;
      }

      const lines = names.map((name) => `• ${prettifyListName(name)} _(${prefix}lista ${name})_`);
      await reply(`📋 *Liste attive*\n\n${lines.join('\n')}`);
      return;
    }

    const listKey = normalizeListName(listNameRaw);
    const items = await getItems(chatId, listKey);

    if (items.length === 0) {
      await reply(
        `📭 La lista *${prettifyListName(listKey)}* è vuota.\n` +
          `Aggiungi qualcosa con *${prefix}aggiungi ${listKey} <oggetto>*`,
      );
      return;
    }

    const pending = items.filter((item) => !item.completed).length;
    const lines = items.map((item, index) => {
      const marker = item.completed ? '✅' : '▫️';
      const label = item.completed ? `~${escapeWa(item.name)}~` : escapeWa(item.name);
      return `${marker} *${index + 1}.* ${label}`;
    });

    await reply(
      `📋 *${prettifyListName(listKey)}* — ${pending} da fare su ${items.length}\n\n` +
        `${lines.join('\n')}\n\n` +
        `_${prefix}preso ${listKey} <numero>_ per spuntare un elemento`,
    );
  },
};
