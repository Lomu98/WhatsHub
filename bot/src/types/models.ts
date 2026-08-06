/**
 * Modelli che rispecchiano 1:1 lo schema del Realtime Database.
 * Se cambi qualcosa qui, allinea anche `dashboard/src/lib/types.ts`.
 */

/** /bot_status */
export interface BotStatus {
  connected: boolean;
  qrCode: string | null;
  lastSeen: number;
  /** campi extra, utili alla dashboard */
  state?: 'starting' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'error';
  phoneNumber?: string | null;
  pushName?: string | null;
  message?: string | null;
  startedAt?: number;
}

/** /commands/{commandId} */
export interface CustomCommand {
  trigger: string;
  description: string;
  responseType: 'static' | 'script';
  responseText?: string;
  enabled: boolean;
  /** extra opzionali gestiti dalla dashboard */
  createdAt?: number;
  updatedAt?: number;
  usageCount?: number;
}

/** /groups/{groupId}/lists/{listName}/{itemId} */
export interface ListItem {
  name: string;
  addedBy: string;
  completed: boolean;
  createdAt: number;
  /** extra: nome leggibile di chi ha aggiunto, per la dashboard */
  addedByName?: string;
  completedBy?: string | null;
  completedAt?: number | null;
}

/**
 * /groups/{chatId}/meta — estensione: dà un nome leggibile alla chat.
 * Nonostante il nome del nodo, contiene anche le chat private: `type` le
 * distingue. Il nome del nodo non è stato cambiato per non forzare una
 * migrazione dei dati esistenti.
 */
export interface GroupMeta {
  name: string;
  type: 'group' | 'private';
  participants: number;
  notify: boolean;
  updatedAt: number;
}

/** /birthdays/{userId} */
export interface Birthday {
  name: string;
  /** formato "DD-MM" */
  date: string;
  addedBy: string;
  /** extra */
  groupId?: string;
  createdAt?: number;
}

/**
 * /groups/{chatId}/events/{eventId} — visibile solo nella chat in cui è stato
 * creato, esattamente come le liste. Non esiste più un nodo /events globale.
 */
export interface CalendarEvent {
  title: string;
  startDate: number;
  /** Facoltativa: eventi di un solo istante non la valorizzano. */
  endDate?: number | null;
  description: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
}

/**
 * /groups/{chatId}/quotes/{quoteId} — citazioni divertenti salvate in questa
 * chat con `!cit`, visibili solo qui.
 */
export interface Quote {
  text: string;
  /** Chi ha detto la frase — non necessariamente chi l'ha registrata. */
  author?: string | null;
  /** Quando è stata detta (di default: quando è stata registrata). */
  date: number;
  /** Chi l'ha registrata via bot. */
  addedBy: string;
  addedByName?: string;
  createdAt: number;
}

/** /logs/{logId} */
export interface CommandLog {
  command: string;
  args: string;
  groupId: string;
  groupName: string;
  authorId: string;
  authorName: string;
  status: 'ok' | 'error' | 'unknown' | 'ignored';
  source: 'builtin' | 'custom' | 'none';
  detail?: string;
  timestamp: number;
}

/** /config — nodo di servizio del bot */
export interface BotConfig {
  lastBirthdayRun?: string;
  notifyGroups?: Record<string, boolean>;
}
