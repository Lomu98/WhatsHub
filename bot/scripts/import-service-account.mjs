#!/usr/bin/env node
/**
 * Importa il JSON del service account Firebase dentro bot/.env.
 *
 * Uso:
 *   npm run setup:firebase --workspace bot -- <percorso-del-json> [url-database]
 *
 * Se ometti il percorso, lo script cerca un service account in bot/ e nella
 * cartella Download. Non stampa mai la chiave privata.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const envFlagIndex = argv.indexOf('--env');
const ENV_PATH =
  envFlagIndex !== -1 ? path.resolve(argv[envFlagIndex + 1]) : path.join(BOT_DIR, '.env');
const positional = argv.filter((arg, index) => {
  if (arg === '--env') return false;
  if (envFlagIndex !== -1 && index === envFlagIndex + 1) return false;
  return !arg.startsWith('--');
});

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

/** Un service account valido ha questi campi e type === 'service_account'. */
function isServiceAccount(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed.type === 'service_account' && parsed.private_key && parsed.client_email;
  } catch {
    return false;
  }
}

/** Cerca un service account nei posti in cui finisce di solito. */
function autodetect() {
  const candidates = [];
  const searchDirs = [BOT_DIR, path.join(os.homedir(), 'Downloads'), process.cwd()];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      if (['package.json', 'package-lock.json', 'tsconfig.json'].includes(file)) continue;
      const full = path.join(dir, file);
      if (isServiceAccount(full)) candidates.push(full);
    }
  }
  return candidates;
}

// --- 1. Individua il file --------------------------------------------------

let jsonPath = positional[0] ? path.resolve(positional[0]) : null;

if (!jsonPath) {
  const found = autodetect();
  if (found.length === 0) {
    fail(
      'Nessun service account JSON trovato.',
      'Scaricalo da: Console Firebase > Impostazioni progetto (icona ingranaggio) >\n' +
        '  Account di servizio > "Genera nuova chiave privata".\n' +
        '  Poi rilancia:  npm run setup:firebase --workspace bot -- percorso/del/file.json',
    );
  }
  jsonPath = found[0];
  console.log(`${c.dim}Trovato automaticamente: ${jsonPath}${c.reset}`);
  if (found.length > 1) {
    console.log(`${c.yellow}Attenzione: trovati ${found.length} file, uso il primo.${c.reset}`);
  }
}

if (!fs.existsSync(jsonPath)) fail(`File non trovato: ${jsonPath}`);
if (!isServiceAccount(jsonPath)) {
  fail(
    `Questo non sembra un service account Firebase: ${jsonPath}`,
    'Deve essere il JSON con "type": "service_account", non il firebaseConfig del web.',
  );
}

const account = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// --- 2. Copia il JSON dentro bot/ e usa il percorso (zero escaping) --------

// Il JSON va accanto al .env di destinazione: in uso normale e' bot/, ma con
// --env (test) resta confinato li', senza toccare le credenziali vere.
const targetJson = path.join(path.dirname(ENV_PATH), 'serviceAccountKey.json');
if (path.resolve(jsonPath) !== targetJson) {
  fs.copyFileSync(jsonPath, targetJson);
  console.log(
    `${c.green}✔${c.reset} Copiato in ${path.relative(BOT_DIR, targetJson) || 'serviceAccountKey.json'} ${c.dim}(gia in .gitignore)${c.reset}`,
  );
}

// --- 3. Ricava l'URL del database ------------------------------------------

/**
 * L'errore piu' comune e' incollare l'URL della console web (quello della barra
 * degli indirizzi, con /project/.../database/... e i parametri utm). Qui lo
 * riconosciamo e ne estraiamo il nome dell'istanza.
 */
function normalizeDatabaseUrl(input) {
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return { instance: null, error: `"${input}" non e' un URL valido.` };
  }

  if (url.hostname === 'console.firebase.google.com') {
    const match = url.pathname.match(/database\/([^/]+)/);
    return match
      ? { instance: match[1], fromConsole: true }
      : { instance: null, error: 'URL della console senza nome istanza riconoscibile.' };
  }

  // Un URL gia' buono: teniamo solo l'host, scartando path e query.
  return { instance: url.hostname.split('.')[0], host: url.hostname };
}

/**
 * Chiede a Firebase qual e' la regione giusta. Su regione sbagliata l'API
 * risponde 404 con { correctUrl }, quindi bastano una o due richieste.
 */
async function resolveDatabaseUrl(instance) {
  const attempts = [
    `https://${instance}.europe-west1.firebasedatabase.app`,
    `https://${instance}.firebaseio.com`,
  ];

  for (const base of attempts) {
    try {
      const response = await fetch(`${base}/.json`, { signal: AbortSignal.timeout(10000) });
      // 401 = esiste ma le regole bloccano; 200 = esiste con regole aperte.
      if (response.status === 401 || response.status === 200) return base;

      const body = await response.json().catch(() => null);
      if (body?.correctUrl) return body.correctUrl.replace(/\/$/, '');
    } catch {
      // host inesistente: passa al candidato successivo
    }
  }
  return null;
}

const instanceName = positional[1]
  ? normalizeDatabaseUrl(positional[1])
  : { instance: `${account.project_id}-default-rtdb` };

if (instanceName.error) fail(instanceName.error);
if (instanceName.fromConsole) {
  console.log(`${c.yellow}⚠${c.reset} Hai passato l'URL della console web; uso l'istanza "${instanceName.instance}".`);
}

process.stdout.write(`${c.dim}Rilevo la regione del database...${c.reset} `);
const resolved = await resolveDatabaseUrl(instanceName.instance);
console.log(resolved ? `${c.green}trovata${c.reset}` : `${c.yellow}nessuna risposta${c.reset}`);

const databaseUrl =
  resolved ?? `https://${instanceName.instance}.europe-west1.firebasedatabase.app`;
const urlWasGuessed = !resolved;

// --- 4. Aggiorna .env ------------------------------------------------------

if (!fs.existsSync(ENV_PATH)) {
  const example = path.join(BOT_DIR, '.env.example');
  if (!fs.existsSync(example)) fail(`Manca sia .env che .env.example in ${BOT_DIR}`);
  fs.copyFileSync(example, ENV_PATH);
  console.log(`${c.green}✔${c.reset} Creato ${path.basename(ENV_PATH)} da .env.example`);
}

let env = fs.readFileSync(ENV_PATH, 'utf8');

/** Sostituisce (o aggiunge) una variabile, commentando le righe duplicate. */
function setVar(name, value) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^#?\\s*${name}=.*$`, 'm');
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
}

/** Commenta una variabile lasciandola visibile come riferimento. */
function commentOut(name) {
  const pattern = new RegExp(`^(${name}=.*)$`, 'm');
  if (pattern.test(env) && !new RegExp(`^#\\s*${name}=`, 'm').test(env)) {
    env = env.replace(pattern, '# $1');
  }
}

setVar('FIREBASE_PROJECT_ID', account.project_id);
setVar('FIREBASE_CLIENT_EMAIL', account.client_email);
setVar('FIREBASE_DATABASE_URL', databaseUrl);
setVar('GOOGLE_APPLICATION_CREDENTIALS', './serviceAccountKey.json');

// Con il file JSON la chiave inline non serve piu: la commentiamo per evitare
// che una versione sbagliata resti in giro a confondere.
commentOut('FIREBASE_PRIVATE_KEY');

fs.writeFileSync(ENV_PATH, env, 'utf8');

// --- 5. Riepilogo ----------------------------------------------------------

console.log(`${c.green}✔${c.reset} Aggiornato ${path.basename(ENV_PATH)}\n`);
console.log(`  ${c.cyan}Progetto${c.reset} ......... ${account.project_id}`);
console.log(`  ${c.cyan}Service account${c.reset} .. ${account.client_email}`);
console.log(`  ${c.cyan}Chiave privata${c.reset} ... letta dal file JSON ${c.dim}(niente da copiare a mano)${c.reset}`);
console.log(`  ${c.cyan}Database URL${c.reset} ..... ${databaseUrl}`);

if (urlWasGuessed) {
  console.log(
    `\n${c.yellow}⚠ Non sono riuscito a contattare il database${c.reset}, l'URL e' una ipotesi.\n` +
      `${c.dim}  Probabile causa: il Realtime Database non e' ancora stato creato.\n` +
      `  Vai in Console Firebase > Build > Realtime Database > "Crea database",\n` +
      `  poi rilancia questo comando: l'URL verra' rilevato da solo.${c.reset}`,
  );
} else {
  console.log(`\n${c.dim}  (regione rilevata interrogando Firebase, non ipotizzata)${c.reset}`);
}

console.log(`\n${c.green}Fatto.${c.reset} Ora puoi avviare il bot:  ${c.cyan}npm run dev:bot${c.reset}`);
