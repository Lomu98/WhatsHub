import 'dotenv/config';
import path from 'node:path';

/** Legge una variabile obbligatoria, fallendo subito con un messaggio chiaro. */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[config] Variabile d'ambiente mancante: ${name}. ` +
        `Copia bot/.env.example in bot/.env e compila i valori.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
}

function csv(name: string): string[] {
  return optional(name, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Il service account può arrivare in due modi:
 *  - GOOGLE_APPLICATION_CREDENTIALS -> percorso al JSON (ha la precedenza)
 *  - FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY -> credenziali inline
 */
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

export const env = {
  firebase: {
    databaseURL: required('FIREBASE_DATABASE_URL'),
    serviceAccountPath: serviceAccountPath
      ? path.resolve(process.cwd(), serviceAccountPath)
      : undefined,
    projectId: serviceAccountPath ? optional('FIREBASE_PROJECT_ID', '') : required('FIREBASE_PROJECT_ID'),
    clientEmail: serviceAccountPath ? optional('FIREBASE_CLIENT_EMAIL', '') : required('FIREBASE_CLIENT_EMAIL'),
    // Le private key nei .env arrivano con \n "letterali": vanno riportati a capo veri.
    privateKey: serviceAccountPath
      ? optional('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n')
      : required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },
  bot: {
    name: optional('BOT_NAME', 'WhatsHub'),
    prefix: optional('BOT_COMMAND_PREFIX', '!'),
    sessionPath: path.resolve(process.cwd(), optional('WA_SESSION_PATH', './.wwebjs_auth')),
    clientId: optional('WA_CLIENT_ID', 'whatshub'),
  },
  schedule: {
    timezone: optional('TZ_NAME', 'Europe/Rome'),
    birthdayCron: optional('BIRTHDAY_CRON', '0 9 * * *'),
    notifyGroupIds: csv('NOTIFY_GROUP_IDS'),
  },
  security: {
    allowScriptCommands: bool('ALLOW_SCRIPT_COMMANDS', false),
    /**
     * Fa reagire il bot anche ai messaggi inviati dall'account su cui gira.
     *
     * Serve quando il bot usa il tuo numero personale: whatsapp-web.js non
     * emette l'evento `message` per i messaggi propri (vedi Client.js, il
     * `return` su `msg.id.fromMe`), quindi senza questa opzione non potresti
     * mai usare i comandi tu stesso.
     *
     * Attivandola il bot ascolta anche `message_create`, con una protezione
     * anti-ciclo perche' in quel flusso rientrano anche le sue stesse risposte.
     */
    allowSelfCommands: bool('ALLOW_SELF_COMMANDS', false),
  },
  logs: {
    retention: Number(optional('LOG_RETENTION', '100')),
  },
  puppeteer: {
    headless: bool('PUPPETEER_HEADLESS', true),
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined,
  },
  whatsapp: {
    /**
     * Versione di WhatsApp Web da caricare.
     *
     * whatsapp-web.js inietta `window.WWebJS` nella pagina di WhatsApp Web e
     * ha 30 secondi per riuscirci: se WhatsApp aggiorna la sua interfaccia in
     * modo incompatibile, l'iniezione fallisce, la libreria lancia
     * "ready timeout" e il bot resta bloccato dopo `authenticated` — senza mai
     * diventare operativo.
     *
     * Il default e' `auto`: whatsapp-web.js sceglie da sola. Fissare una
     * versione serve solo se sospetti un'incompatibilita' — prima verifica nei
     * log del watchdog che `WWebJS` sia davvero `undefined`, altrimenti il
     * problema e' un altro e il pin non aiuta.
     * Elenco versioni: https://github.com/wppconnect-team/wa-version/tree/main/html
     */
    webVersion: optional('WA_WEB_VERSION', 'auto'),
  },
} as const;

export type Env = typeof env;
