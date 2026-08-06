import { env } from '../config/env';
import { db } from '../config/firebase';
import { getBuiltinCommands } from '../commands/registry';
import { createLogger } from '../utils/logger';

const log = createLogger('builtin-cmd');

/**
 * Pubblica su /builtin_commands l'elenco dei comandi integrati.
 *
 * La dashboard lo legge invece di tenere una copia scritta a mano: cosi'
 * aggiungere un comando al codice del bot lo fa comparire automaticamente
 * nell'interfaccia, senza che le due liste possano divergere.
 *
 * Il nodo viene riscritto per intero a ogni avvio, cosi' i comandi rimossi dal
 * codice spariscono anche dalla dashboard.
 */
export async function publishBuiltinCommands(): Promise<void> {
  const commands = getBuiltinCommands();
  const prefix = env.bot.prefix;

  const payload: Record<string, unknown> = {};

  commands.forEach((command, index) => {
    payload[command.name] = {
      name: command.name,
      // `usage` e' scritto con `!`: qui applichiamo il prefisso realmente in uso.
      usage: command.usage.replace(/^!/, prefix),
      description: command.description,
      aliases: (command.aliases ?? []).map((alias) => `${prefix}${alias}`),
      category: command.category,
      groupOnly: command.groupOnly ?? false,
      // Conserva l'ordine di dichiarazione: RTDB restituisce le chiavi ordinate
      // alfabeticamente e perderebbe il raggruppamento pensato per l'utente.
      order: index,
    };
  });

  try {
    await db.ref('builtin_commands').set(payload);
    log.info(`Comandi integrati pubblicati sulla dashboard: ${commands.length}`);
  } catch (error) {
    log.warn('Pubblicazione dei comandi integrati fallita', error);
  }
}
