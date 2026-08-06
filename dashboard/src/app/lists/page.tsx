'use client';

import { useState } from 'react';
import { Bell, CalendarDays, ListTodo, MessageCircle, MessageSquareQuote, Users } from 'lucide-react';
import { ConfigWarning } from '@/components/ConfigWarning';
import { PageHeader } from '@/components/PageHeader';
import { EventsCard } from '@/components/lists/EventsCard';
import { ListCard } from '@/components/lists/ListCard';
import { QuotesCard } from '@/components/lists/QuotesCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toggle } from '@/components/ui/Toggle';
import { setGroupNotify } from '@/lib/db';
import { useRealtimeValue } from '@/lib/hooks/useRealtime';
import type { GroupNode, GroupView } from '@/lib/types';
import { cx, toGroupViews } from '@/lib/utils';

function ChatTypeIcon({ type, size = 14 }: { type: GroupView['type']; size?: number }) {
  return type === 'group' ? <Users size={size} /> : <MessageCircle size={size} />;
}

export default function ListsPage() {
  const { data: groupsRaw, loading } = useRealtimeValue<Record<string, GroupNode> | null>(
    'groups',
    null,
  );
  const chats = toGroupViews(groupsRaw);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Se non c'è selezione esplicita, mostra la prima chat disponibile.
  const selected = chats.find((chat) => chat.id === selectedId) ?? chats[0] ?? null;

  return (
    <>
      <ConfigWarning />

      <PageHeader
        title="Chat & Liste"
        description="Vista globale delle liste attive, nei gruppi e nelle chat private. Ogni modifica è immediatamente visibile su WhatsApp."
      />

      {loading ? (
        <Card>
          <div className="p-8 text-center text-sm text-zinc-500">Caricamento…</div>
        </Card>
      ) : chats.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={22} />}
            title="Nessuna chat rilevata"
            description="Gruppi e chat private compaiono qui la prima volta che qualcuno usa un comando del bot al loro interno."
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Elenco chat */}
          <Card className="h-fit">
            <div className="border-b border-zinc-800 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Chat ({chats.length})
              </p>
            </div>
            <ul className="divide-y divide-zinc-800">
              {chats.map((chat) => {
                const active = selected?.id === chat.id;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(chat.id)}
                      className={cx(
                        'flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors',
                        active
                          ? 'bg-[var(--color-accent-soft)]'
                          : 'hover:bg-[var(--color-surface-2)]',
                      )}
                    >
                      <span
                        className={cx(
                          'mt-0.5 shrink-0',
                          active ? 'text-[var(--color-accent)]' : 'text-zinc-600',
                        )}
                      >
                        <ChatTypeIcon type={chat.type} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className={cx(
                            'truncate text-sm font-medium',
                            active ? 'text-[var(--color-accent)]' : 'text-zinc-200',
                          )}
                        >
                          {chat.name}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {chat.lists.length} list{chat.lists.length === 1 ? 'a' : 'e'} ·{' '}
                          {chat.pendingItems} da fare
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Dettaglio chat selezionata */}
          <div className="space-y-4">
            {selected ? (
              <>
                <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-zinc-50">
                        {selected.name}
                      </h2>
                      <span
                        className={cx(
                          'badge shrink-0',
                          selected.type === 'group'
                            ? 'bg-[var(--color-surface-2)] text-zinc-400'
                            : 'bg-sky-950/50 text-sky-300',
                        )}
                      >
                        <ChatTypeIcon type={selected.type} size={11} />
                        {selected.type === 'group' ? 'Gruppo' : 'Chat privata'}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      {selected.type === 'group' ? (
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} /> {selected.participants} partecipanti
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <ListTodo size={12} /> {selected.totalItems} elementi totali
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} /> {selected.events.length} event
                        {selected.events.length === 1 ? 'o' : 'i'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquareQuote size={12} /> {selected.quotes.length} citazion
                        {selected.quotes.length === 1 ? 'e' : 'i'}
                      </span>
                      <code className="font-mono text-[11px] text-zinc-600">{selected.id}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                    <Bell size={15} className="text-zinc-500" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Auguri automatici</p>
                      <p className="text-[11px] text-zinc-500">Invia i compleanni qui</p>
                    </div>
                    <Toggle
                      checked={selected.notify}
                      onChange={(value) => void setGroupNotify(selected.id, value)}
                      label="Notifiche compleanni in questa chat"
                    />
                  </div>
                </Card>

                {selected.lists.length === 0 ? (
                  <Card>
                    <EmptyState
                      icon={<ListTodo size={22} />}
                      title="Nessuna lista in questa chat"
                      description={`Crea la prima lista da WhatsApp con !aggiungi spesa pane${
                        selected.type === 'private' ? ' (funziona anche in privato)' : ''
                      }`}
                    />
                  </Card>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {selected.lists.map((list) => (
                      <ListCard key={list.name} groupId={selected.id} list={list} />
                    ))}
                  </div>
                )}

                <div className="grid gap-4 xl:grid-cols-2">
                  <EventsCard groupId={selected.id} events={selected.events} />
                  <QuotesCard groupId={selected.id} quotes={selected.quotes} />
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
