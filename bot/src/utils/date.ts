import { env } from '../config/env';

const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Restituisce i componenti data "civili" nel fuso configurato (Europe/Rome di
 * default). Serve perché il server può girare in UTC: senza questo, alle 00:30
 * italiane il bot penserebbe che sia ancora il giorno prima.
 */
export function nowInTimezone(date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.schedule.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** "DD-MM" di oggi nel fuso configurato. */
export function todayKey(date = new Date()): string {
  const { day, month } = nowInTimezone(date);
  return `${pad(day)}-${pad(month)}`;
}

/** "YYYY-MM-DD" di oggi nel fuso configurato (usato come guardia anti-doppio-invio). */
export function todayIsoDate(date = new Date()): string {
  const { year, month, day } = nowInTimezone(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Normalizza una data di compleanno scritta dall'utente nel formato canonico
 * "DD-MM". Accetta 25/12, 25-12, 25.12, 5/1, 25/12/1990.
 * Ritorna null se la data non è valida.
 */
export function parseBirthdayDate(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(day) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;

  // 29 febbraio va accettato: usiamo un anno bisestile come riferimento.
  const daysInMonth = new Date(Date.UTC(2024, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;

  return `${pad(day)}-${pad(month)}`;
}

/** "25-12" -> "25 dicembre" */
export function formatBirthdayDate(ddmm: string): string {
  const [day, month] = ddmm.split('-').map(Number);
  if (!day || !month || month < 1 || month > 12) return ddmm;
  return `${day} ${MONTHS_IT[month - 1]}`;
}

/**
 * Quanti giorni mancano al prossimo compleanno (0 = oggi).
 * Il 29 febbraio negli anni non bisestili viene festeggiato il 1° marzo.
 */
export function daysUntilBirthday(ddmm: string, from = new Date()): number {
  const [day, month] = ddmm.split('-').map(Number);
  if (!day || !month) return Number.MAX_SAFE_INTEGER;

  const today = nowInTimezone(from);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);

  for (const year of [today.year, today.year + 1]) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const effectiveDay = month === 2 && day === 29 && !isLeap ? 1 : day;
    const effectiveMonth = month === 2 && day === 29 && !isLeap ? 3 : month;
    const target = Date.UTC(year, effectiveMonth - 1, effectiveDay);
    if (target >= todayUtc) {
      return Math.round((target - todayUtc) / MS_PER_DAY);
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

/** "mancano 3 giorni" / "domani" / "oggi 🎉" */
export function humanizeDaysLeft(days: number): string {
  if (days === 0) return 'oggi 🎉';
  if (days === 1) return 'domani';
  return `tra ${days} giorni`;
}

/** Formatta un timestamp come sola data, senza ora: "25 dic 2026". */
export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: env.schedule.timezone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/** Formatta un timestamp per i messaggi WhatsApp: "ven 25 dic, 20:30". */
export function formatEventDate(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: env.schedule.timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/** Inizio della giornata odierna (nel fuso configurato) come epoch ms UTC-ish. */
export function startOfToday(from = new Date()): number {
  const { year, month, day } = nowInTimezone(from);
  return Date.UTC(year, month - 1, day) - timezoneOffsetMs(from);
}

/** Offset del fuso configurato rispetto a UTC, in ms (positivo a est di Greenwich). */
function timezoneOffsetMs(date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const local = new Date(date.toLocaleString('en-US', { timeZone: env.schedule.timezone })).getTime();
  return local - utc;
}

/**
 * Converte una data/ora "civile" (anno, mese, giorno, ora, minuto, tutti nel
 * fuso configurato) nell'epoch UTC corrispondente.
 *
 * L'offset viene calcolato su una data vicina a quella target, non su "adesso":
 * necessario perché l'ora legale può differire fra oggi e la data dell'evento
 * (es. crei a novembre un evento per luglio).
 */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = timezoneOffsetMs(new Date(naiveUtc));
  return naiveUtc - offset;
}

/**
 * Analizza una data/ora scritta dall'utente per un evento:
 * "GG/MM[/AAAA] [HH:MM]". L'anno, se omesso, è quello corrente nel fuso
 * configurato; l'ora, se omessa, è mezzanotte.
 *
 * Esempi validi: "25/12", "25/12/2026", "25/12 20:30", "25-12-26 8:00".
 * Ritorna null se il formato o i valori non sono validi.
 */
export function parseEventDateTime(input: string): number | null {
  const match = input
    .trim()
    .match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  let year = match[3] ? Number(match[3]) : nowInTimezone().year;
  if (match[3] && match[3].length === 2) year += 2000;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;

  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;
  if (hour > 23 || minute > 59) return null;

  return zonedTimeToUtc(year, month, day, hour, minute);
}
