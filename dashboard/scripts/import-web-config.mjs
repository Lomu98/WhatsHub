#!/usr/bin/env node
/**
 * Genera dashboard/.env.local leggendo la configurazione dell'app web
 * direttamente dalle Firebase Management API, usando il service account del
 * bot. Evita di copiare a mano sette valori dalla console.
 *
 * Uso:
 *   npm run setup:firebase --workspace dashboard
 *
 * Richiede che bot/serviceAccountKey.json esista (creato da
 * `npm run setup:firebase --workspace bot`).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

const DASHBOARD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_DIR = path.resolve(DASHBOARD_DIR, '..');
const KEY_PATH = path.join(ROOT_DIR, 'bot', 'serviceAccountKey.json');

const argv = process.argv.slice(2);
const envFlagIndex = argv.indexOf('--env');
const ENV_PATH =
  envFlagIndex !== -1
    ? path.resolve(argv[envFlagIndex + 1])
    : path.join(DASHBOARD_DIR, '.env.local');

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function fail(message, hint) {
  console.error(`\n${c.red}✖ ${message}${c.reset}`);
  if (hint) console.error(`${c.dim}  ${hint}${c.reset}`);
  process.exit(1);
}

if (!fs.existsSync(KEY_PATH)) {
  fail(
    'Service account non trovato in bot/serviceAccountKey.json',
    'Esegui prima:  npm run setup:firebase --workspace bot -- percorso/del/file.json',
  );
}

const account = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
const projectId = account.project_id;

console.log(`${c.dim}Progetto: ${projectId}${c.reset}`);

const auth = new GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();

async function api(url) {
  const response = await client.request({ url });
  return response.data;
}

// --- 1. Cerca un'app web gia' registrata -----------------------------------

let webApps = [];
try {
  process.stdout.write('Cerco un\'app web registrata... ');
  const data = await api(`https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`);
  webApps = data.apps ?? [];
  console.log(`${c.green}${webApps.length} trovata/e${c.reset}`);
} catch (error) {
  const status = error.response?.status;
  const reason = error.response?.data?.error?.message ?? error.message;

  if (status === 403) {
    fail(
      'Permessi insufficienti per leggere la configurazione.',
      'La Firebase Management API potrebbe essere disattivata, oppure il service\n' +
        '  account non ha il ruolo necessario. Usa il metodo manuale descritto nel README\n' +
        '  (Console Firebase > Impostazioni progetto > Le tue app > Web).',
    );
  }
  fail(`Chiamata alle Firebase Management API fallita: ${reason}`);
}

if (webApps.length === 0) {
  fail(
    'Nessuna app web registrata in questo progetto Firebase.',
    'Creala dalla console (bastano 30 secondi, non serve installare nulla):\n' +
      '  Console Firebase > Impostazioni progetto (ingranaggio) > sezione "Le tue app"\n' +
      '  > icona </> (Web) > dai un nome (es. "WhatsHub Dashboard") > Registra app.\n' +
      '  Poi rilancia questo comando.',
  );
}

const app = webApps[0];
if (webApps.length > 1) {
  console.log(`${c.yellow}⚠${c.reset} Piu' app web presenti, uso "${app.displayName ?? app.appId}".`);
}

// --- 2. Scarica la config di quell'app -------------------------------------

process.stdout.write('Scarico la configurazione... ');
const config = await api(
  `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${app.appId}/config`,
);
console.log(`${c.green}ok${c.reset}`);

// L'API non restituisce sempre databaseURL: lo ricaviamo dal .env del bot.
let databaseUrl = config.databaseURL;
if (!databaseUrl) {
  const botEnv = path.join(ROOT_DIR, 'bot', '.env');
  if (fs.existsSync(botEnv)) {
    const line = fs
      .readFileSync(botEnv, 'utf8')
      .split(/\r?\n/)
      .find((l) => l.trim().startsWith('FIREBASE_DATABASE_URL='));
    if (line) databaseUrl = line.slice(line.indexOf('=') + 1).trim();
  }
}
if (!databaseUrl) {
  fail('URL del Realtime Database non determinabile. Compilalo a mano in .env.local.');
}

// --- 3. Scrivi .env.local --------------------------------------------------

const values = {
  NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: databaseUrl,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket ?? `${config.projectId}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
};

const missing = Object.entries(values).filter(([, value]) => !value);
if (missing.length > 0) {
  fail(`Valori mancanti nella risposta dell'API: ${missing.map(([k]) => k).join(', ')}`);
}

const content =
  `# Generato da: npm run setup:firebase --workspace dashboard\n` +
  `# App web: ${app.displayName ?? app.appId}\n` +
  `# Questi valori sono PUBBLICI (finiscono nel bundle del browser).\n` +
  `# La protezione dei dati dipende dalle regole del Realtime Database.\n\n` +
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') +
  '\n';

fs.writeFileSync(ENV_PATH, content, 'utf8');

console.log(`\n${c.green}✔${c.reset} Creato ${path.relative(ROOT_DIR, ENV_PATH)}\n`);
console.log(`  ${c.cyan}App web${c.reset} ..... ${app.displayName ?? app.appId}`);
console.log(`  ${c.cyan}Progetto${c.reset} .... ${config.projectId}`);
console.log(`  ${c.cyan}Database${c.reset} .... ${databaseUrl}`);
console.log(`\n${c.green}Fatto.${c.reset} Avvia la dashboard:  ${c.cyan}npm run dev:dashboard${c.reset}`);
