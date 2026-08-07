'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Cake, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfigWarning } from '@/components/ConfigWarning';
import { PageHeader } from '@/components/PageHeader';
import { BirthdayFormModal } from '@/components/calendar/BirthdayFormModal';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { deleteBirthday } from '@/lib/db';
import { useRealtimeList } from '@/lib/hooks/useRealtime';
import type { BirthdayWithId } from '@/lib/types';
import { cx, daysUntilBirthday, formatBirthdayDate, humanizeDaysLeft } from '@/lib/utils';

export default function CalendarPage() {
  const { data: birthdaysRaw } = useRealtimeList<BirthdayWithId>('birthdays', 'userId');

  const [birthdayModal, setBirthdayModal] = useState<{ open: boolean; value: BirthdayWithId | null }>(
    { open: false, value: null },
  );

  const birthdays = birthdaysRaw
    .filter((birthday) => Boolean(birthday.date))
    .map((birthday) => ({ ...birthday, daysLeft: daysUntilBirthday(birthday.date) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <>
      <ConfigWarning />

      <PageHeader
        title="Compleanni"
        description="Il bot invia gli auguri automaticamente ogni mattina alle 09:00 nei gruppi con le notifiche attive."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Compleanni"
            subtitle={`${birthdays.length} registrati`}
            icon={<Cake size={18} />}
            action={
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setBirthdayModal({ open: true, value: null })}
              >
                <Plus size={14} />
                Aggiungi
              </button>
            }
          />

          {birthdays.length === 0 ? (
            <EmptyState
              icon={<Cake size={22} />}
              title="Nessun compleanno registrato"
              description="Aggiungili da qui, oppure dalla chat con !compleanno GG/MM (in gruppo: !compleanno @utente GG/MM)"
            />
          ) : (
            <ul className="divide-y divide-zinc-800">
              {birthdays.map((birthday) => {
                const today = birthday.daysLeft === 0;
                return (
                  <li key={birthday.userId} className="group flex items-center gap-3 px-5 py-3">
                    <span
                      className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm',
                        today
                          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                          : 'bg-[var(--color-surface-2)] text-zinc-500',
                      )}
                    >
                      {today ? '🎉' : '🎂'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{birthday.name}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {formatBirthdayDate(birthday.date)} ·{' '}
                        <span className={cx(today && 'text-[var(--color-accent)]')}>
                          {humanizeDaysLeft(birthday.daysLeft)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <button
                        type="button"
                        className="btn-ghost p-1.5"
                        aria-label={`Modifica ${birthday.name}`}
                        onClick={() => setBirthdayModal({ open: true, value: birthday })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost p-1.5 hover:text-red-400"
                        aria-label={`Elimina ${birthday.name}`}
                        onClick={() => {
                          if (window.confirm(`Eliminare il compleanno di ${birthday.name}?`)) {
                            void deleteBirthday(birthday.userId);
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
        </Card>

        {/* Gli eventi sono legati alla chat in cui vengono creati: si gestiscono
            da Chat & Liste, non da qui — un compleanno vale per tutti, un
            evento no. */}
        <Card className="h-fit">
          <CardHeader title="Eventi" icon={<CalendarDays size={18} />} />
          <div className="space-y-3 p-5">
            <p className="text-sm text-zinc-400">
              Gli eventi sono legati alla chat in cui vengono creati — con{' '}
              <code className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-accent)]">
                !evento
              </code>{' '}
              da WhatsApp, o dalla dashboard scegliendo la chat.
            </p>
            <Link href="/lists" className="btn-secondary w-full justify-center text-xs">
              Vai a Chat & Liste
              <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      </div>

      <BirthdayFormModal
        open={birthdayModal.open}
        birthday={birthdayModal.value}
        onClose={() => setBirthdayModal({ open: false, value: null })}
      />
    </>
  );
}
