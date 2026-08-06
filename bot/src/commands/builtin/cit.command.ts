import { addQuote, getQuotes, getQuotesByAuthor, type StoredQuote } from '../../services/quotes.service';
import { formatShortDate, parseEventDateTime } from '../../utils/date';
import { escapeWa, phoneFromId } from '../../utils/text';
import type { Command } from '../types';

// Supporta sia le virgolette dritte " che quelle tipografiche “ ”, perché
// alcune tastiere dei telefoni le sostituiscono automaticamente mentre scrivi.
const QUOTE_PATTERN = /["“]([^"”]+)["”]/;

const MAX_LISTED = 20;

function formatQuoteLine(quote: StoredQuote): string {
  const author = quote.author ? escapeWa(quote.author) : 'Anonimo';
  return `💬 _"${escapeWa(quote.text)}"_\n   — *${author}* · ${formatShortDate(quote.date)}`;
}

async function replyWithList(
  reply: (text: string) => Promise<void>,
  quotes: StoredQuote[],
  prefix: string,
  authorFilter: string | null,
): Promise<void> {
  if (quotes.length === 0) {
    if (authorFilter) {
      await reply(
        `📭 Nessuna citazione trovata per "${escapeWa(authorFilter)}".\n` +
          `_Se volevi salvarne una nuova, racchiudi la frase tra virgolette:_\n` +
          `_${prefix}cit "una frase simpatica" ${escapeWa(authorFilter)}_`,
      );
      return;
    }
    await reply(
      `📭 Nessuna citazione salvata qui.\n` +
        `_Aggiungine una con ${prefix}cit "una frase simpatica" Nome_`,
    );
    return;
  }

  const shown = quotes.slice(0, MAX_LISTED);
  const header = authorFilter
    ? `💬 *Citazioni di ${escapeWa(authorFilter)}* (${quotes.length})`
    : `💬 *Tutte le citazioni* (${quotes.length})`;
  const footer =
    quotes.length > MAX_LISTED ? `\n\n_...e altre ${quotes.length - MAX_LISTED}._` : '';

  await reply(`${header}\n\n${shown.map(formatQuoteLine).join('\n\n')}${footer}`);
}

export const citCommand: Command = {
  name: 'cit',
  aliases: ['citazione', 'quote'],
  usage: '!cit ["citazione" [@utente|autore] [data]] | [@utente|autore]',
  description:
    'Salva una citazione (fra virgolette) o cerca: senza argomenti tutte, con un nome/menzione solo le sue',
  category: 'citazioni',

  async execute({ message, rawArgs, reply, chatId, authorId, authorName, prefix }) {
    const trimmed = rawArgs.trim();

    // Come !compleanno: se c'e' una menzione, l'autore e' il contatto reale
    // (niente doppioni fra "Marco"/"marco"/"Marco R."). Senza menzione resta
    // testo libero, utile per soprannomi o persone non (piu') nel gruppo.
    const mentions = await message.getMentions();
    const mentioned = mentions[0];
    const mentionedName = mentioned
      ? mentioned.pushname || mentioned.name || mentioned.shortName || phoneFromId(mentioned.id._serialized)
      : null;

    const quoteMatch = trimmed.match(QUOTE_PATTERN);

    // Nessuna frase tra virgolette: è una ricerca, non una nuova citazione.
    if (!quoteMatch) {
      const authorQuery = mentionedName ?? (trimmed || null);
      if (!authorQuery) {
        const quotes = await getQuotes(chatId);
        await replyWithList(reply, quotes, prefix, null);
        return;
      }
      const quotes = await getQuotesByAuthor(chatId, authorQuery);
      await replyWithList(reply, quotes, prefix, authorQuery);
      return;
    }

    // C'è una frase tra virgolette: creazione di una nuova citazione.
    const text = (quoteMatch[1] ?? '').trim();
    if (!text) {
      await reply('⚠️ La citazione tra virgolette è vuota.');
      return;
    }

    // Tutto quello che resta dopo aver tolto le virgolette: facoltativamente
    // <autore> [data], oppure solo <autore>, oppure niente. Se l'autore viene
    // da una menzione, questi token servono solo a cercare la data.
    const remainder = (
      trimmed.slice(0, quoteMatch.index) + trimmed.slice((quoteMatch.index ?? 0) + quoteMatch[0].length)
    ).trim();
    const tokens = remainder.split(/\s+/).filter(Boolean);

    let date = Date.now();
    let author: string | null = mentionedName;

    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1] as string;
      const parsedDate = parseEventDateTime(lastToken);
      if (parsedDate !== null) {
        date = parsedDate;
        if (!mentionedName) author = tokens.slice(0, -1).join(' ').trim() || null;
      } else if (!mentionedName) {
        author = tokens.join(' ').trim() || null;
      }
    }

    const quote = await addQuote({
      groupId: chatId,
      text,
      author,
      date,
      addedBy: authorId,
      addedByName: authorName,
    });

    await reply(
      `💬 Citazione salvata!\n\n${formatQuoteLine(quote)}\n\n` +
        `_Cercala con ${prefix}cit${quote.author ? ` ${quote.author}` : ''}_`,
    );
  },
};
