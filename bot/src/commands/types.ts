import type { Chat, Client, Contact, Message } from 'whatsapp-web.js';

/** Tutto ciò che un comando riceve per fare il suo lavoro. */
export interface CommandContext {
  client: Client;
  message: Message;
  /**
   * Chat e contatto possono essere `null`: WhatsApp Web a volte non li
   * restituisce per i messaggi appena inviati. Usa `chatId`, `isGroup`,
   * `chatName` e `authorName`, che sono sempre valorizzati.
   */
  chat: Chat | null;
  contact: Contact | null;
  /** Nome leggibile della chat, con fallback se i metadati mancano. */
  chatName: string;
  /** Argomenti già divisi per spazi (senza il comando). */
  args: string[];
  /** Argomenti come stringa unica, utile quando servono spazi (es. nome oggetto). */
  rawArgs: string;
  /** Id WhatsApp di chi ha scritto (in gruppo è `message.author`). */
  authorId: string;
  /** Nome visualizzato di chi ha scritto. */
  authorName: string;
  /** Id della chat: per i gruppi termina con `@g.us`. */
  chatId: string;
  isGroup: boolean;
  /** Prefisso configurato (`!` di default). */
  prefix: string;
  /** Risponde nella stessa chat, citando il messaggio originale. */
  reply: (text: string) => Promise<void>;
}

export interface Command {
  /** Nome canonico, senza prefisso. */
  name: string;
  aliases?: string[];
  /** Riga di sintassi mostrata da `!help`. */
  usage: string;
  description: string;
  /** Se true, il comando funziona solo nei gruppi. */
  groupOnly?: boolean;
  /** Sezione di `!help` in cui compare. */
  category: 'liste' | 'calendario' | 'citazioni' | 'utility';
  execute(context: CommandContext): Promise<void>;
}
