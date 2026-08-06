import type { Client, Message } from 'whatsapp-web.js';
import { env } from '../config/env';
import { fetchChatMetaDirect } from '../whatsapp/client';
import { executeCustomCommand } from '../commands/dynamic';
import { findBuiltinCommand } from '../commands/registry';
import type { CommandContext } from '../commands/types';
import {
  findCustomCommand,
  incrementUsage,
} from '../services/customCommands.service';
import { syncGroupMeta } from '../services/lists.service';
import { logCommand } from '../services/logs.service';
import { createLogger } from '../utils/logger';
import { phoneFromId, truncate } from '../utils/text';

const log = createLogger('handler');

/** Divide "!aggiungi spesa pane" in { trigger: 'aggiungi', args: ['spesa','pane'] }. */
function parseCommand(body: string, prefix: string) {
  const withoutPrefix = body.slice(prefix.length).trim();
  const parts = withoutPrefix.split(/\s+/);
  const trigger = (parts[0] ?? '').toLowerCase();
  const args = parts.slice(1);
  return {
    trigger,
    args,
    rawArgs: withoutPrefix.slice(trigger.length).trim(),
  };
}

/**
 * Protezione anti-ciclo per i comandi da se stessi.
 *
 * Con ALLOW_SELF_COMMANDS attivo il bot processa i messaggi `fromMe` — ma le
 * sue stesse risposte sono `fromMe`. Se un comando custom avesse una risposta
 * che inizia con il prefisso, il bot risponderebbe a se stesso all'infinito.
 *
 * Due difese: gli id dei messaggi che abbiamo inviato, e una breve finestra di
 * silenzio per chat che copre la corsa fra l'invio e l'arrivo dell'evento.
 */
const botSentIds = new Set<string>();
const lastBotSendAt = new Map<string, number>();
const SELF_COOLDOWN_MS = 1_000;
const MAX_TRACKED_IDS = 200;

function rememberBotMessage(chatId: string, messageId: string | undefined): void {
  if (messageId) {
    botSentIds.add(messageId);
    // Set mantiene l'ordine d'inserimento: il primo e' il piu' vecchio.
    if (botSentIds.size > MAX_TRACKED_IDS) {
      const oldest = botSentIds.values().next().value;
      if (oldest) botSentIds.delete(oldest);
    }
  }
  lastBotSendAt.set(chatId, Date.now());
}

/**
 * Chat per cui `getChat()` ha gia' fallito. L'errore che arriva a Node e' solo
 * `"r"` (codice minificato della pagina), quindi non e' distinguibile: ci
 * basiamo sull'evidenza che, quando fallisce, fallisce sempre per quella chat.
 * L'insieme si svuota a ogni riavvio del bot.
 */
const chatsWithoutModel = new Set<string>();

/**
 * Tenta `getChat()` una sola volta. In caso di errore non ritenta e non fa
 * throw: il chiamante ha una fonte alternativa per i metadati, e il comando
 * deve funzionare comunque.
 */
async function tryGetChat(message: Message, chatId: string) {
  if (chatsWithoutModel.has(chatId)) return null;

  try {
    return await message.getChat();
  } catch {
    chatsWithoutModel.add(chatId);
    log.debug(`getChat() non disponibile per ${chatId}, uso la lettura diretta.`);
    return null;
  }
}

/** Come sopra, per il contatto: qui un secondo tentativo ha senso. */
async function tryGetContact(message: Message) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await message.getContact();
    } catch (error) {
      if (attempt === 2) {
        log.debug(
          `getContact() non riuscita: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return null;
}

function isOwnEcho(messageId: string, chatId: string): boolean {
  if (botSentIds.has(messageId)) return true;
  const last = lastBotSendAt.get(chatId);
  return last !== undefined && Date.now() - last < SELF_COOLDOWN_MS;
}

export function registerMessageHandler(client: Client): void {
  // Messaggi ricevuti dagli altri. whatsapp-web.js non emette questo evento
  // per i messaggi propri.
  client.on('message', (message) => {
    // Il listener non deve mai fare throw: un errore qui ucciderebbe il processo.
    void handleMessage(client, message).catch((error) =>
      log.error('Errore non gestito nel message handler', error),
    );
  });

  if (!env.security.allowSelfCommands) return;

  log.info('Comandi da se stessi ATTIVI: il bot risponde anche ai tuoi messaggi');

  // `message_create` scatta per tutti i messaggi, in entrata e in uscita:
  // filtriamo sui soli `fromMe`, altrimenti quelli altrui verrebbero
  // processati due volte (una qui e una in `message`).
  client.on('message_create', (message) => {
    // Traccia OGNI messaggio proprio prima di qualunque filtro: se un domani
    // un messaggio sembra "sparire nel nulla", questa riga dice se l'evento è
    // arrivato almeno fin qui — a differenza dei filtri sotto, che escono in
    // silenzio.
    log.debug(
      `message_create fromMe=${message.fromMe} chatId=${message.id?.remote ?? message.to ?? '?'} ` +
        `body="${(message.body ?? '').slice(0, 40)}"`,
    );

    if (!message.fromMe) return;

    void handleMessage(client, message).catch((error) =>
      log.error('Errore non gestito nel message handler (self)', error),
    );
  });
}

async function handleMessage(client: Client, message: Message): Promise<void> {
  const body = message.body?.trim() ?? '';
  const prefix = env.bot.prefix;

  // Filtri veloci: niente prefisso, messaggi di stato.
  if (!body.startsWith(prefix)) return;
  if (body.length <= prefix.length) return;
  if (message.from === 'status@broadcast') return;

  // `id.remote` e' sempre l'id della CHAT, in entrambe le direzioni. Per i
  // messaggi propri `message.from` contiene il NOSTRO id — la chat sta in
  // `message.to` — quindi usarlo come chiave sbaglierebbe bersaglio.
  const chatId = message.id?.remote ?? (message.fromMe ? message.to : message.from);
  const isGroup = chatId.endsWith('@g.us');

  // I messaggi propri passano solo se la funzione e' stata abilitata, e mai
  // quando sono l'eco di una risposta appena inviata dal bot stesso.
  if (message.fromMe) {
    if (!env.security.allowSelfCommands) return;
    if (isOwnEcho(message.id._serialized, chatId)) {
      log.debug('Ignorato messaggio proprio (eco di una risposta del bot)');
      return;
    }
  }

  // Nome chat e mittente sono un di piu': se non si recuperano il comando deve
  // funzionare lo stesso, quindi qui non si fa mai throw.
  const chat = await tryGetChat(message, chatId);
  const contact = await tryGetContact(message);

  // Quando il modello della chat non arriva, leggiamo nome e partecipanti
  // direttamente dalla pagina: ci servono per la dashboard.
  const directMeta = chat ? null : await fetchChatMetaDirect(client, chatId);
  const participants =
    (chat as unknown as { participants?: unknown[] } | null)?.participants?.length ??
    directMeta?.participants ??
    0;

  const authorId = message.author ?? message.from;
  const chatName =
    chat?.name ||
    directMeta?.name ||
    (isGroup ? 'Gruppo senza nome' : 'Chat privata');
  const authorName =
    contact?.pushname || contact?.name || contact?.shortName || phoneFromId(authorId);

  const { trigger, args, rawArgs } = parseCommand(body, prefix);
  if (!trigger) return;

  // Teniamo aggiornati i metadati della chat (gruppo o privata): la dashboard
  // mostra i nomi, non gli id.
  void syncGroupMeta({
    groupId: chatId,
    name: chatName,
    type: isGroup ? 'group' : 'private',
    participants,
  }).catch((error) => log.warn('Sync metadati chat fallita', error));

  const context: CommandContext = {
    client,
    message,
    chat,
    contact,
    chatName,
    args,
    rawArgs,
    authorId,
    authorName,
    chatId,
    isGroup,
    prefix,
    reply: async (text: string) => {
      const sent = await message.reply(text);
      // Registra la risposta cosi' non venga scambiata per un comando quando
      // ALLOW_SELF_COMMANDS e' attivo.
      rememberBotMessage(chatId, sent?.id?._serialized);
    },
  };

  const logBase = {
    command: `${prefix}${trigger}`,
    args: rawArgs,
    groupId: chatId,
    groupName: isGroup ? chatName : 'Chat privata',
    authorId,
    authorName,
  };

  // 1) Comandi built-in
  const builtin = findBuiltinCommand(trigger);
  if (builtin) {
    if (builtin.groupOnly && !isGroup) {
      await context.reply('👥 Questo comando funziona solo nei gruppi.');
      await logCommand({ ...logBase, status: 'ignored', source: 'builtin', detail: 'group only' });
      return;
    }

    try {
      await builtin.execute(context);
      log.info(`${logBase.command} da ${authorName} in "${logBase.groupName}"`);
      await logCommand({ ...logBase, status: 'ok', source: 'builtin' });
    } catch (error) {
      log.error(`Errore nel comando ${logBase.command}`, error);
      await context.reply('💥 Qualcosa è andato storto nell\'esecuzione del comando.');
      await logCommand({
        ...logBase,
        status: 'error',
        source: 'builtin',
        detail: truncate(error instanceof Error ? error.message : String(error)),
      });
    }
    return;
  }

  // 2) Comandi dinamici definiti dalla dashboard
  const custom = findCustomCommand(trigger, prefix);
  if (custom) {
    try {
      const output = await executeCustomCommand(custom, context);
      void incrementUsage(custom.id);
      log.info(`${logBase.command} (custom) da ${authorName}`);
      await logCommand({
        ...logBase,
        status: 'ok',
        source: 'custom',
        detail: output ? truncate(output, 120) : 'nessun output',
      });
    } catch (error) {
      log.error(`Errore nel comando custom ${logBase.command}`, error);
      await logCommand({
        ...logBase,
        status: 'error',
        source: 'custom',
        detail: truncate(error instanceof Error ? error.message : String(error)),
      });
    }
    return;
  }

  // 3) Comando sconosciuto: lo registriamo ma non rispondiamo in chat, per non
  //    diventare rumorosi in un gruppo dove `!` può comparire per caso.
  await logCommand({ ...logBase, status: 'unknown', source: 'none' });
}
