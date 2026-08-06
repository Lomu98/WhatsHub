import { refs } from '../config/firebase';
import type { CustomCommand } from '../types/models';
import { createLogger } from '../utils/logger';

const log = createLogger('custom-cmd');

export interface StoredCustomCommand extends CustomCommand {
  id: string;
}

/**
 * Cache in memoria dei comandi dinamici, tenuta allineata da un listener
 * realtime su /commands. Così ogni messaggio in arrivo si risolve senza una
 * round-trip su Firebase.
 */
let cache = new Map<string, StoredCustomCommand>();
let started = false;

/** Normalizza il trigger: senza prefisso, minuscolo. `!Meteo` e `meteo` coincidono. */
function normalizeTrigger(trigger: string, prefix: string): string {
  const trimmed = trigger.trim().toLowerCase();
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

/** Attacca il listener realtime. Va chiamato una sola volta all'avvio. */
export function watchCustomCommands(prefix: string): void {
  if (started) return;
  started = true;

  refs.commands().on(
    'value',
    (snapshot) => {
      const next = new Map<string, StoredCustomCommand>();
      const raw = (snapshot.val() ?? {}) as Record<string, CustomCommand>;

      for (const [id, command] of Object.entries(raw)) {
        if (!command?.trigger) continue;
        next.set(normalizeTrigger(command.trigger, prefix), { id, ...command });
      }

      cache = next;
      log.info(`Comandi dinamici sincronizzati: ${cache.size}`);
    },
    (error) => log.error('Listener /commands interrotto', error),
  );
}

/** Cerca un comando dinamico abilitato per il trigger indicato. */
export function findCustomCommand(trigger: string, prefix: string): StoredCustomCommand | null {
  const command = cache.get(normalizeTrigger(trigger, prefix));
  if (!command || !command.enabled) return null;
  return command;
}

/** Elenco dei comandi dinamici attivi (usato da `!help`). */
export function listEnabledCustomCommands(): StoredCustomCommand[] {
  return [...cache.values()]
    .filter((command) => command.enabled)
    .sort((a, b) => a.trigger.localeCompare(b.trigger));
}

/** Contatore d'uso, mostrato nella dashboard. Best-effort. */
export async function incrementUsage(commandId: string): Promise<void> {
  try {
    await refs
      .command(commandId)
      .child('usageCount')
      .transaction((current: number | null) => (current ?? 0) + 1);
  } catch (error) {
    log.warn(`Impossibile incrementare usageCount per ${commandId}`, error);
  }
}

/** Stacca il listener (usato dallo shutdown pulito). */
export function stopWatching(): void {
  refs.commands().off();
  started = false;
}
