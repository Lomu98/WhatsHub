'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarHeart,
  LayoutDashboard,
  ListTodo,
  LogOut,
  ScrollText,
  Terminal,
} from 'lucide-react';
import { signOutUser } from '@/lib/auth';
import { useRealtimeValue } from '@/lib/hooks/useRealtime';
import type { BotStatus } from '@/lib/types';
import { botPresence, cx, presenceLabel } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, description: 'Stato e metriche' },
  { href: '/commands', label: 'Comandi', icon: Terminal, description: 'Command builder' },
  { href: '/lists', label: 'Chat & Liste', icon: ListTodo, description: 'Liste in tempo reale' },
  { href: '/calendar', label: 'Compleanni', icon: CalendarHeart, description: 'Calendario globale' },
  { href: '/logs', label: 'Log & Audit', icon: ScrollText, description: 'Comandi eseguiti' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { data: status } = useRealtimeValue<BotStatus | null>('bot_status', null);
  const presence = botPresence(status);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800 bg-[var(--color-surface-1)]">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)] text-lg font-bold text-zinc-950">
          W
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-zinc-100">WhatsHub</p>
          <p className="text-xs text-zinc-500">Admin dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'text-zinc-400 hover:bg-[var(--color-surface-2)] hover:text-zinc-100',
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-2.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5">
          <span
            className={cx(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              presence === 'online' && 'live-dot bg-[var(--color-accent)]',
              presence === 'connecting' && 'animate-pulse bg-amber-400',
              presence === 'offline' && 'bg-red-500',
            )}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-200">
              {presenceLabel(presence, status?.state)}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {status?.pushName ?? status?.message ?? 'in attesa di connessione'}
            </p>
          </div>
        </div>
        <button
          onClick={() => void signOutUser()}
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-[var(--color-surface-2)] hover:text-zinc-200"
        >
          <LogOut size={14} />
          Esci
        </button>
      </div>
    </aside>
  );
}
