// I segni diacritici combinanti (U+0300–U+036F) e lo zero-width space (U+200B)
// sono espressi come stringhe di escape per tenere il sorgente in puro ASCII.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/** Normalizza il nome di una lista: minuscolo, senza accenti, con i trattini al posto degli spazi. */
export function normalizeListName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '');
}

/** Titolo leggibile a partire dalla chiave normalizzata: "lista-spesa" -> "Lista Spesa". */
export function prettifyListName(key: string): string {
  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Estrae il numero di telefono da un id WhatsApp: "393331234567@c.us" -> "393331234567". */
export function phoneFromId(waId: string): string {
  return waId.split('@')[0] ?? waId;
}

/** Tronca una stringa mantenendo leggibilità (per i log). */
export function truncate(input: string, max = 200): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1)}...`;
}

/**
 * Neutralizza i marcatori di formattazione WhatsApp (* _ ~ `) anteponendo uno
 * zero-width space, così il testo scritto dagli utenti non rompe il layout
 * dei messaggi generati dal bot.
 */
export function escapeWa(input: string): string {
  return input.replace(/([*_~`])/g, `${ZERO_WIDTH_SPACE}$1`);
}
