import vm from 'node:vm';
import { env } from '../config/env';
import type { StoredCustomCommand } from '../services/customCommands.service';
import { formatBirthdayDate, todayIsoDate } from '../utils/date';
import { createLogger } from '../utils/logger';
import type { CommandContext } from './types';

const log = createLogger('dynamic');

const SCRIPT_TIMEOUT_MS = 1_000;

/** Variabili sostituibili nei comandi `static` dalla dashboard. */
function buildPlaceholders(context: CommandContext): Record<string, string> {
  return {
    autore: context.authorName,
    author: context.authorName,
    gruppo: context.chatName,
    group: context.chatName,
    args: context.rawArgs,
    arg1: context.args[0] ?? '',
    arg2: context.args[1] ?? '',
    data: todayIsoDate(),
    date: todayIsoDate(),
    ora: new Intl.DateTimeFormat('it-IT', {
      timeZone: env.schedule.timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date()),
    bot: env.bot.name,
  };
}

/** Sostituisce `{{chiave}}` con il valore corrispondente (case-insensitive). */
function interpolate(template: string, placeholders: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const value = placeholders[key.toLowerCase()];
    return value !== undefined ? value : match;
  });
}

/**
 * Esegue uno script utente in una sandbox `node:vm`.
 *
 * ⚠️ Nota di sicurezza: `node:vm` NON è una sandbox di sicurezza a prova di
 * evasione — isola il contesto globale, non il processo. Per questo motivo:
 *   - la funzionalità è disattivata di default (ALLOW_SCRIPT_COMMANDS=false);
 *   - il contesto esposto è un oggetto piatto di soli dati (niente require,
 *     process, fetch, timer);
 *   - c'è un timeout di 1s per fermare i loop infiniti.
 * Attivala solo se la tua dashboard è accessibile esclusivamente a te.
 */
function runScript(script: string, context: CommandContext): string {
  const sandbox = {
    autore: context.authorName,
    authorId: context.authorId,
    gruppo: context.chatName,
    groupId: context.chatId,
    args: [...context.args],
    testo: context.rawArgs,
    now: Date.now(),
    result: '' as unknown,
    // Utility innocue, utili per script "veri"
    random: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    scegli: <T>(options: T[]) => options[Math.floor(Math.random() * options.length)],
    formatDate: formatBirthdayDate,
  };

  const vmContext = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false },
  });

  // Lo script può usare `return` perché lo avvolgiamo in una funzione,
  // oppure assegnare a `result`.
  const wrapped = `result = (function () {\n${script}\n})();`;
  new vm.Script(wrapped, { filename: 'custom-command.js' }).runInContext(vmContext, {
    timeout: SCRIPT_TIMEOUT_MS,
    breakOnSigint: true,
  });

  const output = sandbox.result;
  if (output === undefined || output === null) return '';
  return typeof output === 'string' ? output : JSON.stringify(output);
}

/**
 * Esegue un comando dinamico. Ritorna il testo inviato, o null se il comando
 * non ha prodotto output (e quindi non va risposto nulla).
 */
export async function executeCustomCommand(
  command: StoredCustomCommand,
  context: CommandContext,
): Promise<string | null> {
  if (command.responseType === 'static') {
    const template = command.responseText?.trim();
    if (!template) return null;
    const text = interpolate(template, buildPlaceholders(context));
    await context.reply(text);
    return text;
  }

  if (!env.security.allowScriptCommands) {
    log.warn(`Comando script "${command.trigger}" bloccato: ALLOW_SCRIPT_COMMANDS=false`);
    await context.reply(
      '🔒 I comandi di tipo *script* sono disattivati su questo bot.\n' +
        '_Attivali impostando ALLOW_SCRIPT_COMMANDS=true nel file .env del bot._',
    );
    return null;
  }

  const script = command.responseText?.trim();
  if (!script) return null;

  try {
    const output = runScript(script, context);
    if (!output) return null;
    await context.reply(output);
    return output;
  } catch (error) {
    log.error(`Errore nello script "${command.trigger}"`, error);
    await context.reply(
      `💥 Lo script del comando *${command.trigger}* ha generato un errore.\n` +
        `_${error instanceof Error ? error.message : String(error)}_`,
    );
    return null;
  }
}
