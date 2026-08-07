import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import { env } from '../config/env';
import {
  clearQrCode,
  markConnected,
  markDisconnected,
  publishQrCode,
  updateBotStatus,
} from '../services/status.service';
import { createLogger } from '../utils/logger';
import { phoneFromId } from '../utils/text';

const log = createLogger('whatsapp');

/**
 * Aggancia una versione specifica di WhatsApp Web, scaricata dal repository
 * wa-version. Senza questo la libreria usa l'ultima versione servita da
 * WhatsApp, che puo' essere incompatibile e bloccare il bot dopo
 * `authenticated` (vedi il commento in config/env.ts).
 */
function webVersionOptions(): Record<string, unknown> {
  const version = env.whatsapp.webVersion;

  if (!version || version.toLowerCase() === 'auto') {
    log.info('Versione WhatsApp Web: automatica (nessun pin)');
    return {};
  }

  log.info(`Versione WhatsApp Web fissata a ${version}`);
  return {
    webVersion: version,
    webVersionCache: {
      type: 'remote',
      remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${version}.html`,
    },
  };
}

export function createWhatsAppClient(): Client {
  return new Client({
    authStrategy: new LocalAuth({
      clientId: env.bot.clientId,
      dataPath: env.bot.sessionPath,
    }),
    ...webVersionOptions(),
    puppeteer: {
      headless: env.puppeteer.headless,
      executablePath: env.puppeteer.executablePath,
      // Default puppeteer: 180s. Su storage lento (es. volumi di rete) la
      // sincronizzazione iniziale della cronologia chat può saturare l'I/O di
      // Chromium abbastanza a lungo da far scadere qualunque comando CDP nel
      // frattempo — non solo l'inizializzazione, anche un banale invio di
      // messaggio. Margine ampio apposta: si applica una tantum all'avvio,
      // non rallenta l'uso normale.
      protocolTimeout: 600_000,
      // Nota: `--no-zygote` e' stato rimosso di proposito. Cambia il modo in cui
      // Chromium gestisce i processi figli e provoca errori
      // "Protocol error: Target closed" quando puppeteer espone funzioni mentre
      // la pagina naviga — cioe' esattamente durante attachEventListeners(),
      // bloccando l'inizializzazione prima dell'evento `ready`.
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
      ],
    },
  });
}

/**
 * Collega tutti gli eventi del client agli aggiornamenti di /bot_status.
 * È questo che permette alla dashboard di mostrare il QR e lo stato live.
 */
/**
 * Fra `authenticated` e `ready` whatsapp-web.js sincronizza le chat. Su account
 * grandi puo' volerci qualche minuto, ma a volte resta bloccato del tutto e
 * senza diagnostica sembra semplicemente che il bot sia "offline".
 *
 * Questo watchdog interroga periodicamente lo stato reale del client e lo
 * riporta nei log e su /bot_status, cosi' la dashboard mostra a che punto e'.
 */
/**
 * Riporta nei log del bot gli errori che avvengono DENTRO la pagina.
 *
 * Quando il codice che whatsapp-web.js inietta lancia un'eccezione, puppeteer
 * la consegna alla console del browser, non al processo Node: per questo il
 * terminale resta pulito anche quando l'inizializzazione si rompe. Senza
 * questo aggancio l'errore e' invisibile.
 */
export function attachPageDiagnostics(client: Client): void {
  const MAX_MESSAGES = 30;
  let reported = 0;

  const tryAttach = (attempt: number): void => {
    const page = (client as unknown as { pupPage?: {
      on(event: string, handler: (payload: never) => void): void;
    } }).pupPage;

    // `pupPage` nasce durante initialize(): riproviamo finche' non c'e'.
    if (!page) {
      if (attempt < 120) setTimeout(() => tryAttach(attempt + 1), 500);
      else log.warn('Diagnostica pagina non agganciata: pupPage non disponibile');
      return;
    }

    page.on('pageerror', ((error: Error) => {
      if (reported++ > MAX_MESSAGES) return;
      log.error(`[pagina] Eccezione non gestita: ${error?.message ?? String(error)}`);
    }) as never);

    page.on('console', ((message: { type(): string; text(): string }) => {
      if (message.type() !== 'error') return;
      if (reported++ > MAX_MESSAGES) return;
      log.warn(`[pagina] console.error: ${message.text().slice(0, 300)}`);
    }) as never);

    log.info('Diagnostica della pagina agganciata (errori del browser visibili qui)');
  };

  tryAttach(0);
}

/**
 * Legge nome e numero di partecipanti di una chat direttamente dalla collezione
 * `Chat` di WhatsApp Web.
 *
 * Perche' non usare `message.getChat()`: quel metodo passa da `getChatModel()`
 * di whatsapp-web.js, che per popolare `lastMessage` cerca l'ultimo messaggio
 * RICEVUTO e lo chiede a IndexedDB. Nelle build attuali quella chiave arriva
 * senza `_serialized`, la query fallisce ("No key or key range specified") e
 * l'intera chiamata va in errore — anche quando i dati che ci servono sono
 * disponibilissimi. Qui leggiamo solo quelli, senza toccare i messaggi.
 *
 * Usa gli stessi moduli che la libreria adopera altrove e che il watchdog ha
 * verificato essere presenti (`WAWebWidFactory`, `WAWebCollections`).
 */
export async function fetchChatMetaDirect(
  client: Client,
  chatId: string,
): Promise<{ name: string | null; participants: number } | null> {
  const page = (client as unknown as { pupPage?: { evaluate(source: string): Promise<unknown> } })
    .pupPage;
  if (!page) return null;

  const source = `(() => {
    try {
      const wid = window.require('WAWebWidFactory').createWid(${JSON.stringify(chatId)});
      const chat = window.require('WAWebCollections').Chat.get(wid);
      if (!chat) return { missing: true };
      const meta = chat.groupMetadata;
      return {
        name: chat.formattedTitle || chat.name || (meta && meta.subject) || null,
        participants: (meta && meta.participants && meta.participants.length) || 0
      };
    } catch (e) {
      return { error: String(e && e.message || e) };
    }
  })()`;

  try {
    const result = (await page.evaluate(source)) as {
      name?: string | null;
      participants?: number;
      error?: string;
      missing?: boolean;
    } | null;

    if (!result || result.missing) return null;
    if (result.error) {
      log.warn(`Lettura diretta dei metadati chat fallita: ${result.error}`);
      return null;
    }
    return { name: result.name ?? null, participants: result.participants ?? 0 };
  } catch (error) {
    log.warn(
      `Lettura diretta dei metadati chat non riuscita: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Interroga la pagina di WhatsApp Web per capire a che punto si e' fermata
 * l'inizializzazione. `pupPage` non e' nell'API pubblica ma e' una proprieta'
 * accessibile del client: qui la usiamo in sola lettura, a scopo diagnostico.
 */
async function inspectPage(client: Client): Promise<string> {
  const page = (client as unknown as { pupPage?: {
    isClosed(): boolean;
    evaluate(source: string): Promise<unknown>;
  } }).pupPage;

  if (!page) return 'pagina non disponibile';
  if (page.isClosed()) return 'pagina chiusa (browser terminato)';

  // Il codice va passato come stringa: viene eseguito nel browser, dove `window`
  // e `document` esistono, ma il tsconfig del bot non include i tipi DOM
  // (giustamente: e' codice server). Una funzione tipizzata qui non compilerebbe.
  // Sonda anche i moduli interni che whatsapp-web.js chiama fra `authenticated`
  // e `ready`: sono specifici della build di WhatsApp Web ed e' li' che
  // l'inizializzazione si rompe quando i nomi cambiano.
  const source = `(() => {
    const probeModule = (name) => {
      try {
        const mod = window.require(name);
        return mod ? 'ok' : 'null';
      } catch (e) {
        return 'MANCANTE';
      }
    };
    let connSerialize = 'non provato';
    try {
      const conn = window.require('WAWebConnModel');
      connSerialize = typeof conn.Conn === 'undefined'
        ? 'Conn assente'
        : (typeof conn.Conn.serialize === 'function' ? 'ok' : 'serialize assente');
    } catch (e) { connSerialize = 'errore: ' + e.message; }

    return {
      wwebjs: typeof window.WWebJS,
      requireFn: typeof window.require,
      connModel: probeModule('WAWebConnModel'),
      meUser: probeModule('WAWebUserPrefsMeUser'),
      connSerialize: connSerialize,
      title: document.title
    };
  })()`;

  try {
    const result = (await page.evaluate(source)) as Record<string, string>;
    return (
      `WWebJS=${result.wwebjs}, require=${result.requireFn}, ` +
      `WAWebConnModel=${result.connModel}, Conn.serialize=${result.connSerialize}, ` +
      `WAWebUserPrefsMeUser=${result.meUser}`
    );
  } catch (error) {
    return `ispezione fallita (${error instanceof Error ? error.message : String(error)})`;
  }
}

function startReadyWatchdog(client: Client): () => void {
  const FIRST_CHECK_MS = 90_000;
  const INTERVAL_MS = 60_000;
  const startedAt = Date.now();

  let stopped = false;
  let timer: NodeJS.Timeout;

  const check = async (): Promise<void> => {
    if (stopped) return;

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    let state: string;
    try {
      // getState() interroga direttamente WhatsApp Web: CONNECTED, OPENING,
      // PAIRING, UNPAIRED... e' l'unica fonte attendibile in questa fase.
      state = (await client.getState()) ?? 'UNKNOWN';
    } catch (error) {
      state = `non interrogabile (${error instanceof Error ? error.message : String(error)})`;
    }

    // Ispeziona la pagina per capire QUALE iniezione e' fallita: e' la
    // differenza fra "sta ancora caricando" e "LoadUtils e' andato in errore".
    const probe = await inspectPage(client);

    log.warn(
      `L'evento "ready" non e' ancora arrivato dopo ${elapsed}s. ` +
        `Stato WhatsApp: ${state}. Pagina: ${probe}`,
    );

    await updateBotStatus({
      message: `Bloccato da ${elapsed}s (WhatsApp: ${state}) — ${probe}`,
    });

    if (!stopped) timer = setTimeout(() => void check(), INTERVAL_MS);
  };

  timer = setTimeout(() => void check(), FIRST_CHECK_MS);
  timer.unref?.();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

export function registerClientEvents(client: Client): void {
  let stopWatchdog: (() => void) | null = null;
  // `loading_screen` puo' arrivare anche dopo `authenticated`: senza questa
  // guardia riporterebbe lo stato a "starting", confondendo la dashboard.
  let authenticated = false;
  client.on('qr', (qr) => {
    void (async () => {
      // Comodo se sei davanti al terminale...
      qrcodeTerminal.generate(qr, { small: true });
      log.info('QR code generato — scansiona dal terminale o dalla dashboard');

      // ...ma il flusso principale è la dashboard: pubblichiamo un data URL PNG
      // direttamente renderizzabile con <img src={qrCode} />.
      try {
        const dataUrl = await qrcode.toDataURL(qr, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        await publishQrCode(dataUrl);
      } catch (error) {
        log.error('Generazione QR per la dashboard fallita', error);
      }
    })();
  });

  client.on('loading_screen', (percent, message) => {
    log.info(`Caricamento WhatsApp: ${percent}% ${message}`);
    if (authenticated) return;
    void updateBotStatus({ state: 'starting', message: `Caricamento ${percent}%` });
  });

  client.on('authenticated', () => {
    authenticated = true;
    log.success('Autenticazione riuscita — sincronizzazione delle chat in corso');
    void updateBotStatus({
      state: 'authenticated',
      qrCode: null,
      message: 'Autenticato, sincronizzazione in corso',
    });
    // Il QR e' stato consumato: puliamo il nodo per non lasciarne uno scaduto.
    void clearQrCode();
    stopWatchdog?.();
    stopWatchdog = startReadyWatchdog(client);
  });

  client.on('auth_failure', (message) => {
    log.error(`Autenticazione fallita: ${message}`);
    void updateBotStatus({
      connected: false,
      state: 'error',
      message: `Autenticazione fallita: ${message}`,
    });
  });

  client.on('ready', () => {
    stopWatchdog?.();
    stopWatchdog = null;

    const info = client.info;
    const waId = info?.wid?._serialized;
    log.success(`Bot online come ${info?.pushname ?? 'sconosciuto'} (${waId ?? '?'})`);
    void markConnected({
      phoneNumber: waId ? phoneFromId(waId) : null,
      pushName: info?.pushname ?? null,
    });
  });

  client.on('disconnected', (reason) => {
    log.warn(`Disconnesso: ${reason}`);
    void markDisconnected(String(reason));
  });

  client.on('change_state', (state) => {
    log.info(`Stato connessione: ${state}`);
  });
}
