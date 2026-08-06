import type { ChatType, GroupNode, GroupView, ListView } from './types';

/** Concatena classi condizionali senza dipendenze esterne. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** "25-12" -> "25 dicembre" */
export function formatBirthdayDate(ddmm: string): string {
  const [day, month] = ddmm.split('-').map(Number);
  if (!day || !month || month < 1 || month > 12) return ddmm;
  return `${day} ${MONTHS_IT[month - 1]}`;
}

/** Giorni mancanti al prossimo compleanno (0 = oggi). */
export function daysUntilBirthday(ddmm: string, from = new Date()): number {
  const [day, month] = ddmm.split('-').map(Number);
  if (!day || !month) return Number.MAX_SAFE_INTEGER;

  const todayUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());

  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const effectiveDay = month === 2 && day === 29 && !isLeap ? 1 : day;
    const effectiveMonth = month === 2 && day === 29 && !isLeap ? 3 : month;
    const target = Date.UTC(year, effectiveMonth - 1, effectiveDay);
    if (target >= todayUtc) {
      return Math.round((target - todayUtc) / 86_400_000);
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

export function humanizeDaysLeft(days: number): string {
  if (days === 0) return 'oggi';
  if (days === 1) return 'domani';
  return `tra ${days} giorni`;
}

/** "poco fa" / "5 min fa" / "2 ore fa" / data completa oltre la settimana. */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'poco fa';
  if (seconds < 60) return `${seconds}s fa`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min fa`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} or${hours === 1 ? 'a' : 'e'} fa`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} giorn${days === 1 ? 'o' : 'i'} fa`;

  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(
    new Date(timestamp),
  );
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/** Sola data, senza ora: "25 dic 2026" — usato per le citazioni. */
export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

/** `datetime-local` vuole "YYYY-MM-DDTHH:mm" in ora locale, non ISO/UTC. */
export function toDatetimeLocal(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Titolo leggibile a partire dalla chiave: "lista-spesa" -> "Lista Spesa". */
export function prettifyListName(key: string): string {
  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export type BotPresence = 'online' | 'connecting' | 'offline';

const HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Lo stato del bot non è binario: fra "processo morto" e "operativo" c'è una
 * fase di avvio che può durare minuti (avvio di Chromium, scansione del QR,
 * sincronizzazione delle chat dopo `authenticated`). Mostrarla come "Offline"
 * fa sembrare rotto un bot che sta funzionando.
 *
 * - `online`     -> connesso e heartbeat recente
 * - `connecting` -> processo vivo ma non ancora operativo
 * - `offline`    -> heartbeat fermo (processo terminato) o errore
 */
export function botPresence(status: {
  connected: boolean;
  lastSeen: number;
  state?: string;
} | null): BotPresence {
  if (!status) return 'offline';

  // Senza heartbeat fresco il processo non c'è più, qualunque cosa dica il resto.
  if (Date.now() - status.lastSeen >= HEARTBEAT_TIMEOUT_MS) return 'offline';
  if (status.connected) return 'online';
  if (status.state === 'disconnected' || status.state === 'error') return 'offline';

  return 'connecting';
}

/** Etichetta leggibile, con il dettaglio della fase quando è utile. */
export function presenceLabel(presence: BotPresence, state?: string): string {
  if (presence === 'online') return 'Online';
  if (presence === 'offline') return 'Offline';

  switch (state) {
    case 'starting':
      return 'Avvio in corso';
    case 'qr':
      return 'In attesa del QR';
    case 'authenticated':
      return 'Sincronizzazione';
    default:
      return 'Connessione';
  }
}

/**
 * Deduce il tipo di chat dalla chiave codificata quando `meta.type` manca
 * (dati scritti prima dell'estensione alle chat private). `encodeKey` lascia
 * intatta la `@`, quindi il suffisso `@g_us` / `@c_us` resta riconoscibile.
 */
function inferChatType(id: string): ChatType {
  return id.endsWith('@g_us') ? 'group' : 'private';
}

/** Trasforma il nodo /groups del DB nella struttura piatta usata dalla UI. */
export function toGroupViews(groups: Record<string, GroupNode> | null): GroupView[] {
  if (!groups) return [];

  return Object.entries(groups)
    .map(([id, node]) => {
      const lists: ListView[] = Object.entries(node.lists ?? {}).map(([listName, items]) => {
        const entries = Object.entries(items ?? {})
          .map(([itemId, item]) => ({ id: itemId, ...item }))
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        return {
          name: listName,
          items: entries,
          pending: entries.filter((item) => !item.completed).length,
        };
      });

      const totalItems = lists.reduce((sum, list) => sum + list.items.length, 0);
      const pendingItems = lists.reduce((sum, list) => sum + list.pending, 0);

      const events = Object.entries(node.events ?? {})
        .map(([eventId, event]) => ({ id: eventId, ...event }))
        .sort((a, b) => a.startDate - b.startDate);

      const quotes = Object.entries(node.quotes ?? {})
        .map(([quoteId, quote]) => ({ id: quoteId, ...quote }))
        .sort((a, b) => b.date - a.date);

      return {
        id,
        name: node.meta?.name ?? id,
        type: node.meta?.type ?? inferChatType(id),
        participants: node.meta?.participants ?? 0,
        notify: node.meta?.notify ?? false,
        lists: lists.sort((a, b) => a.name.localeCompare(b.name)),
        totalItems,
        pendingItems,
        events,
        quotes,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
