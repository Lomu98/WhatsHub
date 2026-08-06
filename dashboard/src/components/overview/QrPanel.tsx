'use client';

/* eslint-disable @next/next/no-img-element */

import { CheckCircle2, Loader2, QrCode, Smartphone } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import type { BotStatus } from '@/lib/types';
import { botPresence } from '@/lib/utils';

/**
 * Il bot pubblica il QR come data URL PNG su /bot_status/qrCode.
 * Qui basta renderizzarlo: nessuna libreria QR lato client.
 * Usiamo <img> nativo e non next/image perché la sorgente è un data URI
 * che cambia in tempo reale (l'optimizer di Next non serve).
 */
export function QrPanel({ status }: { status: BotStatus | null }) {
  const presence = botPresence(status);
  const online = presence === 'online';

  // Autenticato ma non ancora operativo: whatsapp-web.js sta sincronizzando le
  // chat. Non serve nessun QR, serve solo pazienza — e dirlo all'utente.
  const syncing = presence === 'connecting' && status?.state === 'authenticated';

  return (
    <Card>
      <CardHeader
        title="Accesso WhatsApp"
        subtitle={online ? 'Sessione attiva' : syncing ? 'Sincronizzazione' : 'Collega il tuo account'}
        icon={<QrCode size={18} />}
      />
      <CardBody className="flex flex-col items-center justify-center gap-4 py-8">
        {online ? (
          <>
            <div className="rounded-full bg-[var(--color-accent-soft)] p-4">
              <CheckCircle2 size={40} className="text-[var(--color-accent)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-100">Bot collegato</p>
              <p className="mt-1 text-xs text-zinc-500">
                {status?.pushName ? `${status.pushName} · ` : ''}
                {status?.phoneNumber ? `+${status.phoneNumber}` : 'account connesso'}
              </p>
            </div>
          </>
        ) : status?.qrCode ? (
          <>
            <div className="rounded-xl bg-white p-3">
              <img src={status.qrCode} alt="QR code per il login WhatsApp" className="h-56 w-56" />
            </div>
            <div className="max-w-xs text-center">
              <p className="text-sm font-medium text-zinc-100">Scansiona per collegare il bot</p>
              <p className="mt-1 text-xs text-zinc-500">
                WhatsApp → Impostazioni → Dispositivi collegati → Collega un dispositivo
              </p>
            </div>
          </>
        ) : syncing ? (
          <>
            <div className="rounded-full bg-amber-950/40 p-4">
              <Loader2 size={40} className="animate-spin text-amber-400" />
            </div>
            <div className="max-w-xs text-center">
              <p className="text-sm font-medium text-zinc-100">Sessione ripristinata</p>
              <p className="mt-1 text-xs text-zinc-500">
                Nessun QR necessario. WhatsApp sta sincronizzando le chat: su un account con
                molti messaggi può richiedere diversi minuti. Il bot passerà online da solo.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-[var(--color-surface-2)] p-4">
              {presence === 'connecting' ? (
                <Loader2 size={40} className="animate-spin text-zinc-500" />
              ) : (
                <Smartphone size={40} className="text-zinc-600" />
              )}
            </div>
            <div className="max-w-xs text-center">
              <p className="text-sm font-medium text-zinc-300">
                {presence === 'connecting' ? 'Avvio del bot in corso…' : 'Bot non in esecuzione'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {presence === 'connecting'
                  ? (status?.message ?? 'Attendi qualche istante.')
                  : 'Avvia il processo del bot (npm run dev:bot): il QR comparirà qui automaticamente.'}
              </p>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
