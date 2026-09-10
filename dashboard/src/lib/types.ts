/**
 * Modelli del Realtime Database, speculari a `bot/src/types/models.ts`.
 * Se cambi lo schema, aggiorna entrambi i file.
 */

export interface BotStatus {
  connected: boolean;
  qrCode: string | null;
  lastSeen: number;
  state?: 'starting' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'error';
  phoneNumber?: string | null;
  pushName?: string | null;
  message?: string | null;
  startedAt?: number;
  /**
   * Esito dell'ultimo backup della sessione RemoteAuth. Non influenza
   * `connected`: rende visibile un backup che smette di funzionare invece di
   * lasciarlo fallire in silenzio.
   */
  lastBackupAt?: number;
  lastBackupOk?: boolean;
  lastBackupError?: string | null;
}

export type CommandResponseType = 'static' | 'script';

export interface CustomCommand {
  trigger: string;
  description: string;
  responseType: CommandResponseType;
  responseText?: string;
  enabled: boolean;
  createdAt?: number;
  updatedAt?: number;
  usageCount?: number;
}

export interface CustomCommandWithId extends CustomCommand {
  id: string;
}

/**
 * /builtin_commands/{name} — pubblicati dal bot a ogni avvio.
 * Sola lettura: per cambiarli si modifica il codice del bot.
 */
export interface BuiltinCommand {
  name: string;
  usage: string;
  description: string;
  aliases: string[];
  category: 'liste' | 'calendario' | 'citazioni' | 'utility';
  groupOnly: boolean;
  order: number;
}

export interface BuiltinCommandWithId extends BuiltinCommand {
  id: string;
}

export interface ListItem {
  name: string;
  addedBy: string;
  completed: boolean;
  createdAt: number;
  addedByName?: string;
  completedBy?: string | null;
  completedAt?: number | null;
}

export interface ListItemWithId extends ListItem {
  id: string;
}

export type ChatType = 'group' | 'private';

/**
 * Nonostante il nome del campo (memoria dello schema originale, solo-gruppi),
 * questo nodo contiene anche le chat private: `type` le distingue.
 */
export interface GroupMeta {
  name: string;
  /** Assente sui dati creati prima dell'estensione alle chat private. */
  type?: ChatType;
  participants: number;
  notify: boolean;
  updatedAt: number;
}

/** Nodo /groups/{chatId} così come arriva dal DB. */
export interface GroupNode {
  meta?: GroupMeta;
  lists?: Record<string, Record<string, ListItem>>;
  events?: Record<string, CalendarEvent>;
  quotes?: Record<string, Quote>;
}

/** Vista appiattita usata dalla UI. */
export interface GroupView {
  id: string;
  name: string;
  type: ChatType;
  participants: number;
  notify: boolean;
  lists: ListView[];
  totalItems: number;
  pendingItems: number;
  events: CalendarEventWithId[];
  quotes: QuoteWithId[];
}

export interface ListView {
  name: string;
  items: ListItemWithId[];
  pending: number;
}

export interface Birthday {
  name: string;
  /** "DD-MM" */
  date: string;
  addedBy: string;
  groupId?: string;
  createdAt?: number;
}

export interface BirthdayWithId extends Birthday {
  userId: string;
}

/**
 * /groups/{chatId}/events/{eventId} — visibile solo nella chat in cui è stato
 * creato. Non esiste più un nodo /events globale.
 */
export interface CalendarEvent {
  title: string;
  startDate: number;
  endDate?: number | null;
  description: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
}

export interface CalendarEventWithId extends CalendarEvent {
  id: string;
}

/**
 * /groups/{chatId}/quotes/{quoteId} — citazioni divertenti salvate con
 * `!cit`, visibili solo nella chat in cui sono state create.
 */
export interface Quote {
  text: string;
  author?: string | null;
  date: number;
  addedBy: string;
  addedByName?: string;
  createdAt: number;
}

export interface QuoteWithId extends Quote {
  id: string;
}

export type LogStatus = 'ok' | 'error' | 'unknown' | 'ignored';
export type LogSource = 'builtin' | 'custom' | 'none';

export interface CommandLog {
  command: string;
  args: string;
  groupId: string;
  groupName: string;
  authorId: string;
  authorName: string;
  status: LogStatus;
  source: LogSource;
  detail?: string | null;
  timestamp: number;
}

export interface CommandLogWithId extends CommandLog {
  id: string;
}
