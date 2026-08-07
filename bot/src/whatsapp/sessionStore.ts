import fs from 'node:fs';
import path from 'node:path';
import type { Store } from 'whatsapp-web.js';

/**
 * Store per `RemoteAuth` che copia lo zip di sessione da/verso una directory
 * durevole (es. il volume Railway), invece di un vero database remoto.
 *
 * `RemoteAuth` tiene il profilo Chromium vivo su `remoteAuthDataPath` (disco
 * veloce ed effimero) e costruisce lì lo zip di backup; qui lo spostiamo solo
 * ogni `backupSyncIntervalMs` verso `volumeDir`. Così il volume — che su
 * Railway ha IOPS limitati — viene toccato a intervalli, non a ogni singola
 * scrittura IndexedDB come accadrebbe tenendoci sopra l'intero profilo
 * (`LocalAuth`), il che saturava l'I/O durante la sincronizzazione iniziale.
 */
export function createFileSessionStore(volumeDir: string, remoteAuthDataPath: string): Store {
  fs.mkdirSync(volumeDir, { recursive: true });

  const zipName = (session: string) => `${session}.zip`;
  const volumeZipPath = (session: string) => path.join(volumeDir, zipName(session));
  const freshZipPath = (session: string) => path.join(remoteAuthDataPath, zipName(session));

  return {
    async sessionExists({ session }) {
      // Non basta l'esistenza del path: un backup interrotto a metà (es. il
      // processo ucciso durante `save()`) può lasciare un file da 0 byte, o un
      // riferimento che poi risulta illeggibile. Meglio scoprirlo qui — dove
      // significa solo "si riparte da un QR nuovo" — che lasciare che
      // `extract()` fallisca più avanti, cosa che whatsapp-web.js non gestisce
      // e che fa crashare l'intero processo.
      try {
        const stat = await fs.promises.stat(volumeZipPath(session));
        return stat.size > 0;
      } catch {
        return false;
      }
    },
    async save({ session }) {
      await fs.promises.copyFile(freshZipPath(session), volumeZipPath(session));
    },
    async extract({ session, path: destPath }) {
      await fs.promises.copyFile(volumeZipPath(session), destPath);
    },
    async delete({ session }) {
      await fs.promises.rm(volumeZipPath(session), { force: true });
    },
  };
}
