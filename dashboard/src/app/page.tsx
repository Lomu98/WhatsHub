'use client';

import Link from 'next/link';
import {
  Activity,
  Cake,
  CalendarDays,
  ListTodo,
  MessageSquareQuote,
  ScrollText,
  Terminal,
  Users,
} from 'lucide-react';
import { ConfigWarning } from '@/components/ConfigWarning';
import { PageHeader } from '@/components/PageHeader';
import { QrPanel } from '@/components/overview/QrPanel';
import { StatTile } from '@/components/overview/StatTile';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRealtimeList, useRealtimeValue } from '@/lib/hooks/useRealtime';
import type { BotStatus, CommandLogWithId, CustomCommandWithId, GroupNode } from '@/lib/types';
import { botPresence, cx, formatTime, presenceLabel, timeAgo, toGroupViews } from '@/lib/utils';

export default function OverviewPage() {
  const { data: status } = useRealtimeValue<BotStatus | null>('bot_status', null);
  const { data: groupsRaw } = useRealtimeValue<Record<string, GroupNode> | null>('groups', null);
  const { data: commands } = useRealtimeList<CustomCommandWithId>('commands');
  const { data: birthdays } = useRealtimeValue<Record<string, unknown> | null>('birthdays', null);
  const { data: logs } = useRealtimeList<CommandLogWithId>('logs');

  const presence = botPresence(status);
  const chats = toGroupViews(groupsRaw);
  const groupChats = chats.filter((chat) => chat.type === 'group');
  const privateChats = chats.filter((chat) => chat.type === 'private');

  const activeLists = chats.reduce((sum, chat) => sum + chat.lists.length, 0);
  const pendingItems = chats.reduce((sum, chat) => sum + chat.pendingItems, 0);
  const enabledCommands = commands.filter((command) => command.enabled).length;
  const birthdayCount = birthdays ? Object.keys(birthdays).length : 0;
  // `chat.events` contiene tutti gli eventi della chat, passati inclusi
  // (utile come storico nella pagina Chat & Liste); qui contiamo solo quelli
  // non ancora conclusi.
  const upcomingEvents = chats.reduce(
    (sum, chat) => sum + chat.events.filter((event) => (event.endDate ?? event.startDate) >= Date.now()).length,
    0,
  );
  const totalQuotes = chats.reduce((sum, chat) => sum + chat.quotes.length, 0);

  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const logsToday = logs.filter((log) => log.timestamp >= startOfDay).length;
  const recentLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

  return (
    <>
      <ConfigWarning />

      <PageHeader
        title="Overview"
        description="Stato del bot, metriche d'uso e ultima attività registrata."
        action={
          <span
            className={cx(
              'badge',
              presence === 'online' && 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
              presence === 'connecting' && 'bg-amber-950/50 text-amber-400',
              presence === 'offline' && 'bg-red-950/50 text-red-400',
            )}
          >
            <span
              className={cx(
                'h-1.5 w-1.5 rounded-full',
                presence === 'online' && 'bg-[var(--color-accent)]',
                presence === 'connecting' && 'animate-pulse bg-amber-400',
                presence === 'offline' && 'bg-red-500',
              )}
            />
            {presenceLabel(presence, status?.state)}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonna sinistra: QR / stato connessione */}
        <div className="lg:col-span-1">
          <QrPanel status={status} />
        </div>

        {/* Colonna destra: metriche */}
        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatTile
              label="Chat attive"
              value={chats.length}
              hint={`${groupChats.length} grupp${groupChats.length === 1 ? 'o' : 'i'} · ${privateChats.length} privat${privateChats.length === 1 ? 'a' : 'e'}`}
              icon={Users}
            />
            <StatTile
              label="Liste attive"
              value={activeLists}
              hint={`${pendingItems} elementi da fare`}
              icon={ListTodo}
            />
            <StatTile
              label="Comandi custom"
              value={commands.length}
              hint={`${enabledCommands} attivi`}
              icon={Terminal}
            />
            <StatTile label="Compleanni" value={birthdayCount} hint="registrati" icon={Cake} />
            <StatTile
              label="Eventi"
              value={upcomingEvents}
              hint="in programma"
              icon={CalendarDays}
            />
            <StatTile
              label="Citazioni"
              value={totalQuotes}
              hint="salvate in tutte le chat"
              icon={MessageSquareQuote}
            />
            <StatTile label="Comandi oggi" value={logsToday} hint="dalla mezzanotte" icon={Activity} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoRow label="Ultimo heartbeat" value={status ? timeAgo(status.lastSeen) : '—'} />
            <InfoRow
              label="Stato interno"
              value={status?.state ?? 'sconosciuto'}
              mono
            />
          </div>
        </div>
      </div>

      {/* Attività recente */}
      <Card className="mt-6">
        <CardHeader
          title="Attività recente"
          subtitle="Ultimi comandi ricevuti dal bot"
          icon={<ScrollText size={18} />}
          action={
            <Link href="/logs" className="btn-ghost text-xs">
              Vedi tutti
            </Link>
          }
        />
        {recentLogs.length === 0 ? (
          <EmptyState
            icon={<ScrollText size={22} />}
            title="Nessun comando registrato"
            description="Appena qualcuno userà un comando in un gruppo, comparirà qui in tempo reale."
          />
        ) : (
          <ul className="divide-y divide-zinc-800">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cx(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    log.status === 'ok'
                      ? 'bg-[var(--color-accent)]'
                      : log.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-zinc-600',
                  )}
                />
                <code className="shrink-0 font-mono text-xs text-zinc-200">{log.command}</code>
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                  {log.authorName} · {log.groupName}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-zinc-600">
                  {formatTime(log.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card flex items-center justify-between px-4 py-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={cx('text-xs text-zinc-300', mono && 'font-mono')}>{value}</span>
    </div>
  );
}
