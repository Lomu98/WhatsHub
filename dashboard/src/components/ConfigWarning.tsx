'use client';

import { AlertTriangle } from 'lucide-react';
import { isFirebaseConfigured } from '@/lib/firebase';

/**
 * Se `.env.local` non è compilato, ogni pagina resterebbe vuota senza spiegare
 * perché. Questo banner rende l'errore immediatamente diagnosticabile.
 */
export function ConfigWarning() {
  if (isFirebaseConfigured) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
      <div className="text-sm">
        <p className="font-medium text-amber-200">Firebase non è configurato</p>
        <p className="mt-1 text-amber-200/70">
          Copia <code className="font-mono text-xs">dashboard/.env.example</code> in{' '}
          <code className="font-mono text-xs">dashboard/.env.local</code>, inserisci le credenziali
          del tuo progetto Firebase e riavvia <code className="font-mono text-xs">npm run dev</code>.
        </p>
      </div>
    </div>
  );
}
