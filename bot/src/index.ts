import type { ScheduledTask } from 'node-cron';
import { env } from './config/env';
import { registerMessageHandler } from './handlers/message.handler';
import { scheduleBirthdayJob } from './jobs/birthday.job';
import { publishBuiltinCommands } from './services/builtinCommands.service';
import { stopWatching, watchCustomCommands } from './services/customCommands.service';
import { markDisconnected, startHeartbeat, updateBotStatus } from './services/status.service';
import { createLogger } from './utils/logger';
import {
  attachPageDiagnostics,
  createWhatsAppClient,
  registerClientEvents,
} from './whatsapp/client';

const log = createLogger('whatshub');

const BANNER = `
 __      __.__            __         ___ ___      ___.
/  \\    /  \\  |__ _____ _/  |_  _____\\  \\  /  |__ \\_ |__
\\   \\/\\/   /  |  \\\\__  \\\\   __\\/  ___/\\   \\/   |  \\ | __ \\
 \\        /|   Y  \\/ __ \\|  |  \\___ \\  \\      /|   \\| \\_\\ \\
  \\__/\\  / |___|  (____  /__| /____  >  \\__/ |___|  /___  /
       \\/       \\/     \\/          \\/             \\/    \\/
`;

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(BANNER);
  log.info(`Avvio ${env.bot.name} — prefisso comandi "${env.bot.prefix}"`);
  log.info(`Fuso orario: ${env.schedule.timezone}`);

  await updateBotStatus({
    connected: false,
    qrCode: null,
    state: 'starting',
    message: 'Avvio del bot in corso...',
  });

  // Cache realtime dei comandi dinamici: pronta prima che arrivi il primo messaggio.
  watchCustomCommands(env.bot.prefix);

  // Rende i comandi integrati visibili nella dashboard, sempre allineati al codice.
  await publishBuiltinCommands();

  const client = createWhatsAppClient();
  registerClientEvents(client);
  registerMessageHandler(client);
  // Rende visibili nel terminale gli errori che avvengono dentro la pagina.
  attachPageDiagnostics(client);

  let birthdayTask: ScheduledTask | undefined;
  const heartbeat = startHeartbeat();

  client.on('ready', () => {
    // Il cron viene attivato solo a client pronto: prima non potrebbe inviare nulla.
    if (!birthdayTask) {
      birthdayTask = scheduleBirthdayJob(client);
    }
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    log.warn(`Ricevuto ${signal}, chiusura in corso...`);
    clearInterval(heartbeat);
    birthdayTask?.stop();
    stopWatching();

    try {
      await markDisconnected('Bot arrestato');
      await client.destroy();
    } catch (error) {
      log.error('Errore durante lo shutdown', error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    log.error('Promise rifiutata senza handler', reason);
  });
  process.on('uncaughtException', (error) => {
    log.error('Eccezione non gestita', error);
    void updateBotStatus({ connected: false, state: 'error', message: String(error) });
  });

  log.info('Inizializzazione del client WhatsApp (può richiedere qualche secondo)...');
  await client.initialize();
}

main().catch((error) => {
  log.error('Avvio fallito', error);
  process.exit(1);
});
