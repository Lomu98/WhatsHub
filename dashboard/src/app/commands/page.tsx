'use client';

import { useState } from 'react';
import { Code2, FileText, Pencil, Plus, Sparkles, Terminal, Trash2 } from 'lucide-react';
import { ConfigWarning } from '@/components/ConfigWarning';
import { PageHeader } from '@/components/PageHeader';
import { BuiltinCommands } from '@/components/commands/BuiltinCommands';
import { CommandFormModal } from '@/components/commands/CommandFormModal';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toggle } from '@/components/ui/Toggle';
import { deleteCommand, toggleCommand } from '@/lib/db';
import { useRealtimeList } from '@/lib/hooks/useRealtime';
import type { CustomCommandWithId } from '@/lib/types';
import { cx, timeAgo } from '@/lib/utils';

export default function CommandsPage() {
  const { data: commands, loading } = useRealtimeList<CustomCommandWithId>('commands');
  const [editing, setEditing] = useState<CustomCommandWithId | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = [...commands].sort((a, b) => a.trigger.localeCompare(b.trigger));

  async function handleToggle(command: CustomCommandWithId, enabled: boolean) {
    setBusyId(command.id);
    try {
      await toggleCommand(command.id, enabled);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(command: CustomCommandWithId) {
    if (!window.confirm(`Eliminare definitivamente il comando "${command.trigger}"?`)) return;
    setBusyId(command.id);
    try {
      await deleteCommand(command.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <ConfigWarning />

      <PageHeader
        title="Comandi"
        description="I comandi integrati nel bot, e quelli personalizzati che puoi creare da qui senza toccare il codice."
        action={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Nuovo comando
          </button>
        }
      />

      <BuiltinCommands />

      <Card>
        <CardHeader
          title="Comandi personalizzati"
          subtitle={
            sorted.length > 0
              ? `${sorted.length} definiti · ${sorted.filter((c) => c.enabled).length} attivi`
              : 'Creali da qui: il bot li carica in tempo reale, senza riavvii'
          }
          icon={<Sparkles size={18} />}
        />
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-500">Caricamento…</div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Terminal size={22} />}
            title="Nessun comando personalizzato"
            description="I comandi built-in (!lista, !compleanni, …) funzionano già. Qui puoi aggiungerne di tuoi, come !meteo o !regole."
            action={
              <button type="button" className="btn-secondary mt-2" onClick={() => setCreating(true)}>
                <Plus size={16} />
                Crea il primo comando
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="w-full">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="th">Trigger</th>
                  <th className="th">Descrizione</th>
                  <th className="th">Tipo</th>
                  <th className="th">Usi</th>
                  <th className="th">Aggiornato</th>
                  <th className="th text-right">Stato</th>
                  <th className="th sr-only">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sorted.map((command) => (
                  <tr
                    key={command.id}
                    className={cx(
                      'transition-colors hover:bg-[var(--color-surface-2)]/50',
                      !command.enabled && 'opacity-55',
                    )}
                  >
                    <td className="td">
                      <code className="rounded bg-[var(--color-surface-2)] px-2 py-1 font-mono text-xs text-[var(--color-accent)]">
                        {command.trigger.startsWith('!') ? command.trigger : `!${command.trigger}`}
                      </code>
                    </td>
                    <td className="td max-w-xs">
                      <span className="line-clamp-1 text-zinc-400">
                        {command.description || '—'}
                      </span>
                    </td>
                    <td className="td">
                      <span
                        className={cx(
                          'badge',
                          command.responseType === 'script'
                            ? 'bg-violet-950/50 text-violet-300'
                            : 'bg-sky-950/50 text-sky-300',
                        )}
                      >
                        {command.responseType === 'script' ? (
                          <Code2 size={12} />
                        ) : (
                          <FileText size={12} />
                        )}
                        {command.responseType}
                      </span>
                    </td>
                    <td className="td tabular-nums text-zinc-500">{command.usageCount ?? 0}</td>
                    <td className="td text-xs text-zinc-500">
                      {command.updatedAt ? timeAgo(command.updatedAt) : '—'}
                    </td>
                    <td className="td">
                      <div className="flex justify-end">
                        <Toggle
                          checked={command.enabled}
                          disabled={busyId === command.id}
                          onChange={(value) => void handleToggle(command, value)}
                          label={`Attiva ${command.trigger}`}
                        />
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="btn-ghost p-2"
                          aria-label={`Modifica ${command.trigger}`}
                          onClick={() => setEditing(command)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2 hover:text-red-400"
                          aria-label={`Elimina ${command.trigger}`}
                          disabled={busyId === command.id}
                          onClick={() => void handleDelete(command)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CommandFormModal
        open={creating || editing !== null}
        command={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}
