import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full bg-[var(--color-surface-2)] p-3 text-zinc-600">{icon}</div>
      <div>
        <p className="text-sm font-medium text-zinc-300">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
