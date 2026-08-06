import type { LucideIcon } from 'lucide-react';

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          {/* tabular-nums: il numero non "salta" quando cambia in tempo reale */}
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-50">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <span className="rounded-lg bg-[var(--color-surface-2)] p-2 text-zinc-500">
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}
