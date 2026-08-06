'use client';

import { useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventFormModal } from '@/components/calendar/EventFormModal';
import { deleteEvent } from '@/lib/db';
import type { CalendarEventWithId } from '@/lib/types';
import { cx, formatDateTime } from '@/lib/utils';

/** Eventi della chat selezionata: creazione, modifica, cancellazione. */
export function EventsCard({ groupId, events }: { groupId: string; events: CalendarEventWithId[] }) {
  const [modal, setModal] = useState<{ open: boolean; value: CalendarEventWithId | null }>({
    open: false,
    value: null,
  });

  const now = Date.now();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Eventi"
        subtitle={`${events.filter((event) => (event.endDate ?? event.startDate) >= now).length} in programma`}
        icon={<CalendarDays size={18} />}
        action={
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setModal({ open: true, value: null })}
          >
            <Plus size={14} />
            Aggiungi
          </button>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="Nessun evento in questa chat"
          description="Creane uno da qui, oppure da WhatsApp con !evento"
        />
      ) : (
        <ul className="divide-y divide-zinc-800">
          {events.map((event) => {
            const relevantDate = event.endDate ?? event.startDate;
            const past = relevantDate < now;
            return (
              <li
                key={event.id}
                className={cx('group flex items-start gap-3 px-5 py-3', past && 'opacity-50')}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-sm text-zinc-500">
                  📌
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{event.title}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDateTime(event.startDate)}
                    {event.endDate ? ` → ${formatDateTime(event.endDate)}` : ''}
                  </p>
                  {event.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{event.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    className="btn-ghost p-1.5"
                    aria-label={`Modifica ${event.title}`}
                    onClick={() => setModal({ open: true, value: event })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost p-1.5 hover:text-red-400"
                    aria-label={`Elimina ${event.title}`}
                    onClick={() => {
                      if (window.confirm(`Eliminare l'evento "${event.title}"?`)) {
                        void deleteEvent(groupId, event.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <EventFormModal
        open={modal.open}
        groupId={groupId}
        event={modal.value}
        onClose={() => setModal({ open: false, value: null })}
      />
    </Card>
  );
}
