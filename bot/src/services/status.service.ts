import { refs } from '../config/firebase';
import type { BotStatus } from '../types/models';
import { createLogger } from '../utils/logger';

const log = createLogger('status');

const startedAt = Date.now();

/**
 * Scrive lo stato del bot su /bot_status. È il nodo che la dashboard osserva in
 * tempo reale per mostrare pallino verde/rosso e QR code.
 */
export async function updateBotStatus(patch: Partial<BotStatus>): Promise<void> {
  try {
    await refs.botStatus().update({
      lastSeen: Date.now(),
      startedAt,
      ...patch,
    });
  } catch (error) {
    log.error('Impossibile aggiornare /bot_status', error);
  }
}

/** Pubblica il QR (data URL PNG) così può essere scansionato dalla dashboard web. */
export async function publishQrCode(dataUrl: string): Promise<void> {
  await updateBotStatus({
    connected: false,
    qrCode: dataUrl,
    state: 'qr',
    message: 'Scansiona il QR code da WhatsApp > Dispositivi collegati',
  });
}

/** Rimuove il QR: o è stato usato, o è scaduto. */
export async function clearQrCode(): Promise<void> {
  await updateBotStatus({ qrCode: null });
}

export async function markConnected(info: {
  phoneNumber?: string | null;
  pushName?: string | null;
}): Promise<void> {
  await updateBotStatus({
    connected: true,
    qrCode: null,
    state: 'ready',
    message: 'Bot online',
    phoneNumber: info.phoneNumber ?? null,
    pushName: info.pushName ?? null,
  });
}

export async function markDisconnected(reason: string): Promise<void> {
  await updateBotStatus({
    connected: false,
    state: 'disconnected',
    message: reason,
  });
}

/**
 * Heartbeat: aggiorna `lastSeen` a intervalli regolari. Se il processo muore di
 * colpo (crash, kill, VPS spenta) il campo smette di aggiornarsi e la dashboard
 * può mostrare "offline" anche senza un evento di disconnessione.
 */
export function startHeartbeat(intervalMs = 30_000): NodeJS.Timeout {
  const timer = setInterval(() => {
    void refs
      .botStatus()
      .update({ lastSeen: Date.now() })
      .catch((error) => log.warn('Heartbeat fallito', error));
  }, intervalMs);

  timer.unref?.();
  return timer;
}
