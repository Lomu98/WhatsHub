'use client';

import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { addListItem, clearList, deleteListItem, setItemCompleted } from '@/lib/db';
import type { ListView } from '@/lib/types';
import { cx, prettifyListName, timeAgo } from '@/lib/utils';

export function ListCard({ groupId, list }: { groupId: string; list: ListView }) {
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const name = newItem.trim();
    if (!name) return;

    setAdding(true);
    try {
      await addListItem({ groupId, listName: list.name, name, addedByName: 'Dashboard' });
      setNewItem('');
    } finally {
      setAdding(false);
    }
  }

  async function handleClear() {
    if (!window.confirm(`Svuotare la lista "${prettifyListName(list.name)}"?`)) return;
    await clearList(groupId, list.name);
  }

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={prettifyListName(list.name)}
        subtitle={`${list.pending} da fare su ${list.items.length}`}
        action={
          <button
            type="button"
            className="btn-ghost p-2 hover:text-red-400"
            onClick={() => void handleClear()}
            aria-label={`Svuota ${list.name}`}
            title="Svuota lista"
          >
            <Trash2 size={15} />
          </button>
        }
      />

      <ul className="max-h-72 flex-1 divide-y divide-zinc-800 overflow-y-auto">
        {list.items.map((item, index) => (
          <li key={item.id} className="group flex items-center gap-3 px-4 py-2.5">
            <button
              type="button"
              onClick={() =>
                void setItemCompleted({
                  groupId,
                  listName: list.name,
                  itemId: item.id,
                  completed: !item.completed,
                })
              }
              aria-label={item.completed ? 'Segna come da fare' : 'Segna come completato'}
              className={cx(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                item.completed
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-zinc-950'
                  : 'border-zinc-600 hover:border-[var(--color-accent)]',
              )}
            >
              {item.completed ? <Check size={12} strokeWidth={3} /> : null}
            </button>

            <span className="w-5 shrink-0 text-right font-mono text-[11px] text-zinc-600">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={cx(
                  'truncate text-sm',
                  item.completed ? 'text-zinc-600 line-through' : 'text-zinc-200',
                )}
              >
                {item.name}
              </p>
              <p className="truncate text-[11px] text-zinc-600">
                {item.addedByName ?? 'sconosciuto'} · {timeAgo(item.createdAt)}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void deleteListItem({ groupId, listName: list.name, itemId: item.id })
              }
              aria-label={`Elimina ${item.name}`}
              className="btn-ghost p-1.5 opacity-100 transition-opacity hover:text-red-400 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 border-t border-zinc-800 p-3">
        <input
          className="input"
          placeholder="Aggiungi un elemento…"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAdd();
          }}
        />
        <button
          type="button"
          className="btn-secondary shrink-0 px-3"
          onClick={() => void handleAdd()}
          disabled={adding || !newItem.trim()}
          aria-label="Aggiungi elemento"
        >
          <Plus size={16} />
        </button>
      </div>
    </Card>
  );
}
