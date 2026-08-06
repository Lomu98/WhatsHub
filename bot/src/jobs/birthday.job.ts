import cron from 'node-cron';
import type { Client } from 'whatsapp-web.js';
import { env } from '../config/env';
import { refs } from '../config/firebase';
import { getTodayBirthdays } from '../services/birthdays.service';
import { createLogger } from '../utils/logger';
import { escapeWa } from '../utils/text';
import { todayIsoDate } from '../utils/date';

const log = createLogger('cron:compleanni');

/**
 * Gruppi a cui inviare gli auguri:
 *  1. NOTIFY_GROUP_IDS dal .env (ha la precedenza, utile in fase di setup)
 *  2. i gruppi con `meta.notify === true` su /groups (gestibili dalla dashboard)
 */
async function resolveTargetGroups(): Promise<string[]> {
  if (env.schedule.notifyGroupIds.length > 0) {
    return env.schedule.notifyGroupIds;
  }

  const snapshot = await refs.groups().get();
  if (!snapshot.exists()) return [];

  const groups = snapshot.val() as Record<string, { meta?: { notify?: boolean } }>;
  return Object.entries(groups)
    .filter(([, group]) => group?.meta?.notify === true)
    .map(([groupId]) => groupId);
}

function buildMessage(names: string[]): string {
  if (names.length === 1) {
    return (
      `🎉🎂 *Tanti auguri ${escapeWa(names[0] as string)}!* 🎂🎉\n\n` +
      `Oggi è il tuo compleanno — buona giornata da tutto il gruppo! 🥳`
    );
  }

  const list = names.map((name) => `• *${escapeWa(name)}*`).join('\n');
  return (
    `🎉🎂 *Doppio (o triplo) compleanno oggi!* 🎂🎉\n\n${list}\n\n` +
    `Auguri a tutti e tre... ehm, a tutti quanti! 🥳`
  );
}

/**
 * Controlla i compleanni di oggi e invia gli auguri.
 * Esportata a parte così può essere invocata anche manualmente (test/debug).
 */
export async function runBirthdayCheck(client: Client, options: { force?: boolean } = {}): Promise<void> {
  const today = todayIsoDate();

  // Guardia anti-doppio-invio: se il processo riparte più volte nella stessa
  // mattina, il messaggio parte comunque una volta sola.
  if (!options.force) {
    const lastRun = (await refs.config().child('lastBirthdayRun').get()).val();
    if (lastRun === today) {
      log.info(`Controllo già eseguito oggi (${today}), salto.`);
      return;
    }
  }

  const birthdays = await getTodayBirthdays();
  await refs.config().child('lastBirthdayRun').set(today);

  if (birthdays.length === 0) {
    log.info('Nessun compleanno oggi.');
    return;
  }

  const targets = await resolveTargetGroups();
  if (targets.length === 0) {
    log.warn(
      'Ci sono compleanni oggi ma nessun gruppo di destinazione. ' +
        'Imposta NOTIFY_GROUP_IDS nel .env o attiva le notifiche su un gruppo dalla dashboard.',
    );
    return;
  }

  const text = buildMessage(birthdays.map((birthday) => birthday.name));

  for (const groupId of targets) {
    try {
      await client.sendMessage(groupId, text);
      log.success(`Auguri inviati a ${groupId} (${birthdays.length} festeggiati)`);
    } catch (error) {
      log.error(`Invio auguri fallito per ${groupId}`, error);
    }
  }
}

/** Registra il cron job. Ritorna il task, così lo shutdown può fermarlo. */
export function scheduleBirthdayJob(client: Client): cron.ScheduledTask {
  const expression = env.schedule.birthdayCron;

  if (!cron.validate(expression)) {
    throw new Error(`[cron] Espressione BIRTHDAY_CRON non valida: "${expression}"`);
  }

  const task = cron.schedule(
    expression,
    () => {
      void runBirthdayCheck(client).catch((error) =>
        log.error('Controllo compleanni fallito', error),
      );
    },
    { timezone: env.schedule.timezone },
  );

  log.info(`Job compleanni programmato: "${expression}" (${env.schedule.timezone})`);
  return task;
}
