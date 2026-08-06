'use client';

import {
  CalendarHeart,
  ListTodo,
  Lock,
  MessageSquareQuote,
  Settings2,
  Terminal,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRealtimeList } from '@/lib/hooks/useRealtime';
import type { BuiltinCommandWithId } from '@/lib/types';
import { cx } from '@/lib/utils';

const CATEGORIES = [
  { key: 'liste', label: 'Liste', icon: ListTodo },
  { key: 'calendario', label: 'Calendario', icon: CalendarHeart },
  { key: 'citazioni', label: 'Citazioni', icon: MessageSquareQuote },
  { key: 'utility', label: 'Utility', icon: Settings2 },
] as const;

/**
 * Elenco dei comandi integrati nel bot. Non è scritto qui: lo pubblica il bot
 * su /builtin_commands a ogni avvio, così resta sempre allineato al codice.
 */
export function BuiltinCommands() {
  const { data: commands, loading } = useRealtimeList<BuiltinCommandWithId>('builtin_commands');
  const sorted = [...commands].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <Card className="mb-6">
      <CardHeader
        title="Comandi integrati"
        subtitle={
          sorted.length > 0
            ? `${sorted.length} comandi disponibili in ogni chat dove è presente il bot`
            : 'Pubblicati dal bot all’avvio'
        }
        icon={<Terminal size={18} />}
        action={
          <span className="badge bg-[var(--color-surface-2)] text-zinc-500">sola lettura</span>
        }
      />

      {loading ? (
        <div className="p-8 text-center text-sm text-zinc-500">Caricamento…</div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Terminal size={22} />}
          title="Elenco non ancora disponibile"
          description="Il bot pubblica i comandi integrati all'avvio. Avvialo almeno una volta (npm run dev:bot) e questa sezione si popolerà da sola."
        />
      ) : (
        <div className="divide-y divide-zinc-800">
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const group = sorted.filter((command) => command.category === key);
            if (group.length === 0) return null;

            return (
              <section key={key} className="px-5 py-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Icon size={13} />
                  {label}
                </h3>

                <ul className="space-y-3">
                  {group.map((command) => (
                    <li key={command.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <code className="rounded bg-[var(--color-surface-2)] px-2 py-1 font-mono text-xs text-[var(--color-accent)]">
                        {command.usage}
                      </code>

                      {command.groupOnly ? (
                        <span
                          className="badge bg-amber-950/40 text-amber-400/90"
                          title="Nelle chat private questo comando non risponde"
                        >
                          <Lock size={10} />
                          solo gruppi
                        </span>
                      ) : null}

                      <span className="w-full text-xs text-zinc-400 sm:w-auto sm:flex-1">
                        {command.description}
                      </span>

                      {command.aliases?.length ? (
                        <span className="font-mono text-[11px] text-zinc-600">
                          {command.aliases.join(' · ')}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p
        className={cx(
          'border-t border-zinc-800 px-5 py-3 text-xs text-zinc-600',
          sorted.length === 0 && 'hidden',
        )}
      >
        Questi comandi vivono nel codice del bot e non sono modificabili da qui. Per aggiungerne
        uno senza toccare il codice, usa i comandi personalizzati qui sotto.
      </p>
    </Card>
  );
}
