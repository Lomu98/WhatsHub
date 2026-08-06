import { refs } from '../config/firebase';
import type { Quote } from '../types/models';

export interface StoredQuote extends Quote {
  id: string;
}

/** Salva una citazione, visibile solo nella chat (`groupId`) in cui viene creata. */
export async function addQuote(params: {
  groupId: string;
  text: string;
  author?: string | null;
  date: number;
  addedBy: string;
  addedByName?: string;
}): Promise<StoredQuote> {
  const ref = refs.groupQuotes(params.groupId).push();
  const quote: Quote = {
    text: params.text,
    author: params.author ?? null,
    date: params.date,
    addedBy: params.addedBy,
    addedByName: params.addedByName,
    createdAt: Date.now(),
  };
  await ref.set(quote);
  return { id: ref.key as string, ...quote };
}

/** Tutte le citazioni di questa chat, più recenti prima. */
export async function getQuotes(groupId: string): Promise<StoredQuote[]> {
  const snapshot = await refs.groupQuotes(groupId).get();
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, Quote>;
  return Object.entries(raw)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.date - a.date);
}

/**
 * Citazioni il cui autore corrisponde a `authorQuery` (senza distinguere
 * maiuscole/minuscole). Il confronto è bidirezionale apposta: una citazione
 * salvata con testo libero breve ("Marco") e una ricerca fatta per menzione,
 * che risolve al nome WhatsApp completo ("Marco Rossi"), sono la stessa
 * persona anche se nessuna delle due stringhe è letteralmente più lunga
 * dell'altra in modo prevedibile — dipende da chi ha scritto cosa per primo.
 *
 * Limite noto e non risolvibile qui: un soprannome slegato dal nome reale
 * ("Pelle" per "Pietro") non ha nessuna parte di stringa in comune col nome
 * risolto da una menzione, quindi resta trovabile solo cercando lo stesso
 * soprannome via testo libero.
 */
export async function getQuotesByAuthor(
  groupId: string,
  authorQuery: string,
): Promise<StoredQuote[]> {
  const needle = authorQuery.trim().toLowerCase();
  const all = await getQuotes(groupId);
  return all.filter((quote) => {
    const author = quote.author?.toLowerCase();
    if (!author) return false;
    return author.includes(needle) || needle.includes(author);
  });
}
