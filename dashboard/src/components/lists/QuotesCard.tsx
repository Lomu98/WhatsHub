'use client';

import { useMemo, useState } from 'react';
import { MessageSquareQuote, Plus, Search, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuoteFormModal } from '@/components/lists/QuoteFormModal';
import { deleteQuote } from '@/lib/db';
import type { QuoteWithId } from '@/lib/types';
import { formatShortDate } from '@/lib/utils';

/** Citazioni della chat selezionata: creazione, ricerca per autore, cancellazione. */
export function QuotesCard({ groupId, quotes }: { groupId: string; quotes: QuoteWithId[] }) {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return quotes;
    return quotes.filter(
      (quote) =>
        quote.author?.toLowerCase().includes(needle) ||
        quote.text.toLowerCase().includes(needle),
    );
  }, [quotes, query]);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Citazioni"
        subtitle={`${quotes.length} salvate`}
        icon={<MessageSquareQuote size={18} />}
        action={
          <button type="button" className="btn-secondary text-xs" onClick={() => setCreating(true)}>
            <Plus size={14} />
            Aggiungi
          </button>
        }
      />

      {quotes.length === 0 ? (
        <EmptyState
          icon={<MessageSquareQuote size={22} />}
          title="Nessuna citazione in questa chat"
          description={'Salvane una da qui, o da WhatsApp con !cit "una frase simpatica" Nome'}
        />
      ) : (
        <>
          <div className="border-b border-zinc-800 p-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
              />
              <input
                className="input pl-8 text-xs"
                placeholder="Cerca per autore o testo…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              Nessuna citazione corrisponde a &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-zinc-800 overflow-y-auto">
              {filtered.map((quote) => (
                <li key={quote.id} className="group flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 shrink-0 text-lg text-zinc-600">💬</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm italic text-zinc-200">&ldquo;{quote.text}&rdquo;</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      — <span className="font-medium text-zinc-400">{quote.author || 'Anonimo'}</span>{' '}
                      · {formatShortDate(quote.date)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost p-1.5 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    aria-label="Elimina citazione"
                    onClick={() => {
                      if (window.confirm('Eliminare questa citazione?')) {
                        void deleteQuote(groupId, quote.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <QuoteFormModal open={creating} groupId={groupId} onClose={() => setCreating(false)} />
    </Card>
  );
}
