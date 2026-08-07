'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { isEmailAllowed, signInWithGoogle, watchAuthState } from '@/lib/auth';
import { isFirebaseConfigured } from '@/lib/firebase';

type Status = 'loading' | 'signed-out' | 'forbidden' | 'signed-in';

/**
 * La vera protezione dei dati sono le regole del Realtime Database
 * (`auth != null && auth.token.email === '...'`): questo componente serve
 * solo a non far vedere la dashboard (e i suoi errori "permission denied")
 * a chi non è autorizzato, mostrando invece una schermata di login chiara.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return watchAuthState((current) => {
      setUser(current);
      if (!current) setStatus('signed-out');
      else setStatus(isEmailAllowed(current.email) ? 'signed-in' : 'forbidden');
    });
  }, []);

  const handleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso fallito.');
    }
  };

  if (!isFirebaseConfigured || status === 'signed-in') {
    // Config mancante: lascia passare, ConfigWarning esistente se ne occupa già.
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {status === 'forbidden' ? (
        <>
          <ShieldAlert size={40} className="text-amber-400" />
          <div>
            <p className="text-sm font-medium text-zinc-100">
              {user?.email} non è autorizzata ad accedere a questa dashboard.
            </p>
            <p className="mt-1 text-xs text-zinc-500">Prova con un altro account Google.</p>
          </div>
        </>
      ) : (
        <>
          <LogIn size={40} className="text-zinc-500" />
          <div>
            <p className="text-sm font-medium text-zinc-100">Accesso riservato</p>
            <p className="mt-1 text-xs text-zinc-500">Accedi con l&apos;account Google autorizzato.</p>
          </div>
        </>
      )}
      <button
        onClick={() => void handleSignIn()}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Accedi con Google
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
