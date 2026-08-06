import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhatsHub — Admin Dashboard',
  description: 'Pannello di controllo per il bot WhatsApp WhatsHub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      {/*
        suppressHydrationWarning: alcune estensioni del browser (Grammarly,
        gestori di password, traduttori) iniettano attributi nel <body> prima
        che React faccia l'hydration, generando un falso allarme di mismatch.
        L'attributo vale SOLO per questo elemento — attributi e testo diretti —
        e non nasconde eventuali mismatch reali nei componenti figli.
      */}
      <body className="min-h-screen" suppressHydrationWarning>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
