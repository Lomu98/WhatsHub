import { env } from '../config/env';
import { refs } from '../config/firebase';
import type { CommandLog } from '../types/models';
import { createLogger } from '../utils/logger';
import { truncate } from '../utils/text';

const log = createLogger('logs');

/**
 * Registra un comando su /logs e mantiene solo le ultime N voci.
 * Non fa mai throw: un problema di logging non deve far cadere il comando.
 */
export async function logCommand(entry: Omit<CommandLog, 'timestamp'>): Promise<void> {
  try {
    await refs.logs().push({
      ...entry,
      args: truncate(entry.args, 300),
      detail: entry.detail ? truncate(entry.detail, 300) : null,
      timestamp: Date.now(),
    });
    await trimLogs();
  } catch (error) {
    log.warn('Impossibile scrivere il log del comando', error);
  }
}

/**
 * Le push key di RTDB sono ordinabili lessicograficamente per tempo di
 * creazione: basta leggere le più vecchie e cancellarle in un unico update.
 */
async function trimLogs(): Promise<void> {
  const retention = Number.isFinite(env.logs.retention) ? env.logs.retention : 100;
  const snapshot = await refs.logs().orderByKey().get();
  if (!snapshot.exists()) return;

  const keys = Object.keys(snapshot.val() as Record<string, unknown>).sort();
  if (keys.length <= retention) return;

  const removals: Record<string, null> = {};
  for (const key of keys.slice(0, keys.length - retention)) {
    removals[key] = null;
  }
  await refs.logs().update(removals);
}
