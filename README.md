# 🤖 WhatsHub

Monorepo Node.js/TypeScript che combina un **bot WhatsApp per gruppi di amici** e una **dashboard web di amministrazione**, sincronizzati in tempo reale tramite Firebase Realtime Database.

```
WhatsHub/
├── bot/              # Bot WhatsApp (whatsapp-web.js + firebase-admin)
├── dashboard/        # Dashboard admin (Next.js App Router + Tailwind + Firebase JS SDK)
├── database.rules.json
├── .env.example
└── package.json      # npm workspaces
```

---

## ✨ Cosa fa

| Funzione | Nel gruppo WhatsApp | Nella dashboard |
|---|---|---|
| **Liste condivise** | `!aggiungi spesa pane`, `!lista spesa`, `!preso spesa 2`, `!svuota spesa` | Vista globale, spunta/elimina elementi, svuota liste |
| **Compleanni** | `!compleanni`, `!compleanno @utente 25/12` | Calendario completo con CRUD |
| **Eventi** | `!eventi` | Crea e modifica appuntamenti |
| **Comandi custom** | Qualsiasi trigger tu definisca | Command Builder senza toccare il codice |
| **Login** | — | QR code direttamente nel browser |
| **Audit** | — | Log realtime degli ultimi 100 comandi |
| **Auguri automatici** | Messaggio ogni mattina alle 09:00 | Scegli in quali gruppi inviarli |

---

## 📋 Prerequisiti

- **Node.js ≥ 20** (testato su 24.11)
- Un **progetto Firebase** con Realtime Database attivo
- Un **numero WhatsApp** dedicato al bot (consigliato: un secondo numero, non il tuo principale)
- Il bot scarica automaticamente Chromium tramite Puppeteer (~150 MB al primo `npm install`)

---

## 🚀 Setup in 5 passi

### 1. Installa le dipendenze

Dalla root del progetto — npm workspaces installa entrambi i pacchetti in un colpo solo:

```bash
npm install
```

### 2. Crea il progetto Firebase

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) → **Aggiungi progetto**
2. Nel menu laterale: **Build → Realtime Database → Crea database**
   - Scegli la regione (es. `europe-west1`)
   - Parti in **modalità bloccata** (le regole le impostiamo al passo 5)
3. Annota l'**URL del database**, del tipo:
   `https://whatshub-xxxxx-default-rtdb.europe-west1.firebasedatabase.app`

### 3. Configura il bot (credenziali server)

**Impostazioni progetto** (⚙️) → **Account di servizio** → **Genera nuova chiave privata**. Si scarica un file JSON.

#### Metodo consigliato: lo script di import

Non devi copiare niente a mano — soprattutto non la chiave privata:

```bash
npm run setup:firebase --workspace bot -- "C:\percorso\del\file-scaricato.json"
```

Lo script copia il JSON in `bot/serviceAccountKey.json` (già in `.gitignore`), compila `bot/.env` con project id, email e URL del database, e commenta `FIREBASE_PRIVATE_KEY` perché non serve più.

Se ometti il percorso, cerca da solo un service account in `bot/` e nella cartella **Download**:

```bash
npm run setup:firebase --workspace bot
```

L'URL del database viene ipotizzato (regione `europe-west1`). Se il tuo è diverso, passalo come secondo argomento o correggi `FIREBASE_DATABASE_URL` in `bot/.env`:

```bash
npm run setup:firebase --workspace bot -- "percorso.json" "https://tuo-url-vero"
```

#### Metodo manuale (alternativa)

Se preferisci fare a mano, hai due strade. La **più semplice** evita del tutto l'escaping:

```env
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIREBASE_DATABASE_URL=https://whatshub-xxxxx-default-rtdb.europe-west1.firebasedatabase.app
```

Salvi il JSON scaricato come `bot/serviceAccountKey.json` e basta: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` puoi lasciarli commentati, perché quando `GOOGLE_APPLICATION_CREDENTIALS` è valorizzata ha la precedenza.

Se invece vuoi proprio le credenziali inline (utile su host che accettano solo variabili d'ambiente, tipo Railway o Fly.io), copia i valori dal JSON:

```env
FIREBASE_PROJECT_ID=whatshub-xxxxx
FIREBASE_DATABASE_URL=https://whatshub-xxxxx-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@whatshub-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...lunghissima...\n-----END PRIVATE KEY-----\n"
```

> ⚠️ Sulla `FIREBASE_PRIVATE_KEY` valgono tre regole, tutte necessarie:
> 1. **Tutto su una riga sola** — nel JSON la chiave è già una riga sola, non riformattarla.
> 2. **Tra virgolette doppie.**
> 3. **I `\n` restano `\n` letterali** (backslash + lettera n), non vanno trasformati in a capo veri. Nel JSON sono già così: copia il valore esattamente com'è, virgolette incluse.

### 4. Configura la dashboard (config pubblica)

Serve un'**app web** registrata nel progetto: **Impostazioni progetto** → sezione *Le tue app* → icona **`</>`** → dai un nome → **Registra app**.

#### Metodo consigliato: lo script di import

Una volta registrata l'app, questo comando scarica i sette valori dalle Firebase Management API usando il service account del passo 3 — nessun copia-incolla:

```bash
npm run setup:firebase --workspace dashboard
```

Se il server di sviluppo è già avviato non serve riavviarlo: Next.js rileva `.env.local` da solo.

#### Metodo manuale (alternativa)

**Impostazioni progetto** → **Le tue app** → app Web → copia l'oggetto `firebaseConfig`.

```bash
cp dashboard/.env.example dashboard/.env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=whatshub-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://whatshub-xxxxx-default-rtdb.europe-west1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=whatshub-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=whatshub-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### 5. Imposta le regole del database

⚠️ **Passo obbligatorio, non saltarlo.** Un database appena creato è in *modalità bloccata*: il **bot funziona lo stesso** (l'Admin SDK ignora le regole), ma la **dashboard no** — vedresti tutte le pagine vuote e il QR code non comparirebbe mai, senza nessun messaggio d'errore evidente.

**Per lavorare in locale**, incolla il contenuto di [`database.rules.dev.json`](database.rules.dev.json) in **Realtime Database → Regole → Pubblica**:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Quando pubblichi la dashboard online**, passa a [`database.rules.json`](database.rules.json), che richiede autenticazione:

```bash
firebase deploy --only database
```

> 🔓 Le regole aperte vanno bene finché tutto gira su `localhost`, perché l'URL del database non è noto a nessun altro. Diventano un problema nel momento in cui pubblichi la dashboard: da lì in poi chiunque legga il bundle JavaScript conosce l'URL e può leggere e scrivere tutto. Vedi [Sicurezza](#-sicurezza).

---

## ▶️ Avvio

```bash
npm run dev            # bot + dashboard insieme
npm run dev:bot        # solo il bot
npm run dev:dashboard  # solo la dashboard → http://localhost:3100
```

> La dashboard gira sulla porta **3100** (non 3000, che è spesso già occupata da altri progetti). Per cambiarla, modifica `dev` e `start` in [`dashboard/package.json`](dashboard/package.json), oppure passala al volo:
> `npm run dev:dashboard -- -p 4500`

**Primo login:**

1. Avvia il bot: `npm run dev:bot`
2. Apri la dashboard su [localhost:3100](http://localhost:3100) → il **QR code compare nella pagina Overview**
3. Sul telefono: WhatsApp → **Impostazioni → Dispositivi collegati → Collega un dispositivo** → inquadra il QR
4. Il pallino diventa verde: il bot è online

Il QR compare anche nel terminale, ma il flusso pensato è quello via browser — così puoi collegare il bot anche quando gira su un server remoto senza accesso al terminale.

La sessione è persistente (`LocalAuth`): ai riavvii successivi il login non serve più. Per azzerarla: `npm run session:reset --workspace bot`.

---

## 💬 Comandi del bot

Prefisso di default `!`, configurabile con `BOT_COMMAND_PREFIX`. **Tutti i comandi funzionano sia nei gruppi sia nelle chat private** con il bot — nelle chat private le liste sono personali, per la chat in questione.

### Liste

| Comando | Alias | Descrizione |
|---|---|---|
| `!aggiungi <lista> <oggetto>` | `!add` | Aggiunge un oggetto (la lista viene creata al volo) |
| `!lista <nome>` | `!list`, `!liste` | Mostra la lista numerata. Senza argomenti elenca tutte le liste |
| `!preso <lista> <numero>` | `!fatto`, `!done` | Spunta l'elemento N |
| `!svuota <lista>` | `!clear`, `!reset` | Svuota la lista |

### Calendario

| Comando | Alias | Descrizione |
|---|---|---|
| `!compleanni` | `!bday` | Prossimi compleanni ordinati per vicinanza |
| `!compleanno [@utente] GG/MM` | `!setbday` | Nei gruppi richiede la menzione; in chat privata, senza menzione, registra il tuo compleanno |
| `!evento <nome> \| <inizio> \| [<fine>] \| [<descrizione>]` | `!aggiungievento` | Crea un evento **visibile solo in questa chat**. Scrivi solo `!evento` per la guida |
| `!eventi` | `!appuntamenti` | Prossimi eventi creati in questa chat |

**Sintassi di `!evento`** — i campi sono separati da `|` (non da spazi, perché nome e descrizione possono contenerne). Le date usano il formato *GG/MM[/AAAA] [HH:MM]*: l'anno, se omesso, è quello corrente; l'ora, se omessa, è mezzanotte.

```
!evento Cena di Natale | 25/12 20:00
!evento Weekend al mare | 25/07 | 27/07 | Portare la crema solare
```

Il terzo campo è ambiguo solo quando manca il quarto: se è una data valida viene letto come fine evento, altrimenti come descrizione — quindi `!evento Cena | 25/12 20:00 | Da Luigi` funziona senza bisogno di lasciare vuoto il campo della fine.

### Citazioni

| Comando | Alias | Descrizione |
|---|---|---|
| `!cit "citazione" [@utente\|autore] [data]` | `!citazione`, `!quote` | Salva una citazione, **visibile solo in questa chat** |
| `!cit` | | Mostra tutte le citazioni salvate qui |
| `!cit @utente` / `!cit <autore>` | | Mostra solo le citazioni di quella persona |

Il bot capisce cosa vuoi fare dalla presenza delle virgolette: se il messaggio contiene una frase fra `"..."` la salva, altrimenti la tratta come una ricerca.

```
!cit "Non toccate il mio caffè"
!cit "Non toccate il mio caffè" @Marco
!cit "Non toccate il mio caffè" Il Biondo
!cit "Non toccate il mio caffè" @Marco 25/12/2024
!cit @Marco
!cit Il Biondo
!cit
```

**Autore: menzione o testo libero, come `!compleanno`.** Menzionando qualcuno (`@Marco`) il bot salva il suo vero nome contatto — evita doppioni fra "Marco", "marco", "Marco R.". Senza menzione, l'autore resta testo libero: comodo per soprannomi o per citare chi non è (più) nel gruppo. Con la menzione, eventuale altro testo dopo di essa viene ignorato (tranne una data finale, che viene comunque letta).

Data e autore sono entrambi facoltativi. In assenza di menzione: se l'ultima parola dopo la citazione è una data valida (*GG/MM[/AAAA]*), viene letta come tale e tutto ciò che resta prima è l'autore — anche se il nome ha più parole (`!cit "Frase" Marco Rossi 25/12` → autore "Marco Rossi"). Senza data, tutto ciò che segue la citazione è l'autore. Senza autore, la citazione risulta "Anonimo" e resta comunque cercabile per testo dalla dashboard.

> 🔍 **Ricerca per autore.** `!cit Marco` e `!cit @Marco` cercano entrambi, in modo case-insensitive e in entrambe le direzioni: trovano sia "Marco Rossi" partendo da "Marco", sia il contrario. **Un soprannome, però, resta trovabile solo con lo stesso soprannome**: `!cit @Pietro` non troverà una citazione salvata come "Pelle" se non è mai stato scritto "Pietro" da nessuna parte — nessuna ricerca testuale può collegare i due nomi da sola.

### Utility

| Comando | Alias | Descrizione |
|---|---|---|
| `!help` | `!hub`, `!aiuto`, `!comandi` | Guida completa, comandi custom inclusi |

**Esempio d'uso in un gruppo:**

```
Marco:  !aggiungi spesa 2 litri di latte
Bot:    ✅ Aggiunto a Spesa: 2 litri di latte

Anna:   !lista spesa
Bot:    📋 Spesa — 1 da fare su 1
        ▫️ 1. 2 litri di latte

Anna:   !preso spesa 1
Bot:    ✅ Preso: 2 litri di latte
        🎉 Spesa completata!
```

---

## 🎛️ La dashboard

| Pagina | Cosa ci trovi |
|---|---|
| **Overview** (`/`) | Stato connessione, QR code di login, 6 metriche d'uso, attività recente |
| **Comandi** (`/commands`) | Elenco dei comandi integrati (pubblicato dal bot, sola lettura) + crea/modifica/attiva comandi custom in tempo reale |
| **Chat & Liste** (`/lists`) | Liste, eventi e citazioni di ogni gruppo e chat privata. Spunta, elimina, aggiungi elementi, svuota liste; crea/elimina eventi; cerca, aggiungi ed elimina citazioni |
| **Compleanni** (`/calendar`) | CRUD completo sui compleanni (globali). Eventi e citazioni, essendo per-chat, si gestiscono da *Chat & Liste* |
| **Log & Audit** (`/logs`) | Ultimi 100 comandi, con ricerca e filtri per esito |

### Comandi custom

Due tipi:

**`static`** — testo fisso con variabili sostituite a runtime:

```
Ciao {{autore}}! Benvenuto in {{gruppo}}. Oggi è {{data}}.
```

Variabili disponibili: `{{autore}}`, `{{gruppo}}`, `{{args}}`, `{{arg1}}`, `{{arg2}}`, `{{data}}`, `{{ora}}`, `{{bot}}`.

**`script`** — JavaScript eseguito in sandbox `node:vm`:

```js
return `Numero fortunato di ${autore}: ${random(1, 100)}`;
```

Contesto disponibile: `autore`, `authorId`, `gruppo`, `groupId`, `args`, `testo`, `now`, `random(min,max)`, `scegli([...])`, `formatDate()`.

> ⚠️ I comandi `script` sono **disattivati di default**. `node:vm` isola il contesto globale ma **non è una sandbox di sicurezza a prova di evasione**: attivali con `ALLOW_SCRIPT_COMMANDS=true` solo se sei l'unico ad avere accesso alla dashboard. C'è comunque un timeout di 1s e nessun accesso a rete, filesystem o `require`.

---

### Il bot sul tuo numero, o su uno dedicato?

`whatsapp-web.js` riceve solo i messaggi **degli altri**: WhatsApp non consegna alla sessione collegata i messaggi inviati dall'account stesso. Se il bot gira sul tuo numero, non potrà mai sentire i tuoi comandi.

```env
ALLOW_SELF_COMMANDS=true
```

Con questa opzione il bot ascolta anche `message_create`, l'evento che include i messaggi propri, e risponde anche a te. C'è una protezione anti-ciclo: le risposte del bot sono anch'esse "messaggi propri", e un comando custom con risposta che inizia per `!` innescherebbe un ciclo infinito — il bot tiene traccia degli id che ha inviato e ignora la propria eco.

> ⚠️ **Perché un numero dedicato resta l'opzione migliore.** Non è una questione di comodità ma di rischio: `whatsapp-web.js` automatizza WhatsApp Web in un modo che le condizioni d'uso non prevedono, e l'account può essere bloccato. Se è il tuo numero personale, perdi il *tuo* WhatsApp con tutte le tue chat. Per un gruppo di amici con traffico basso il rischio è modesto, ma esiste.

## ⏰ Auguri automatici

Un cron job (`node-cron`) controlla ogni mattina alle **09:00** (fuso `Europe/Rome`) se ci sono compleanni in data odierna e invia gli auguri sui gruppi configurati.

```env
BIRTHDAY_CRON=0 9 * * *     # min ora giorno mese giorno-settimana
TZ_NAME=Europe/Rome
NOTIFY_GROUP_IDS=           # opzionale, vedi sotto
```

**Come scegliere i gruppi destinatari** — due modi:

1. **Dalla dashboard** (consigliato): pagina *Chat & Liste* → seleziona il gruppo → attiva **"Auguri automatici"**
2. **Da `.env`**: `NOTIFY_GROUP_IDS=120363011111111111@g.us,120363022222222222@g.us`
   (l'id del gruppo è visibile nella dashboard sotto il nome del gruppo)

Se `NOTIFY_GROUP_IDS` è valorizzato ha la precedenza sulla configurazione della dashboard.

Dettagli di robustezza:
- Una guardia su `/config/lastBirthdayRun` evita doppi invii se il processo riparte più volte nella stessa mattina.
- Il 29 febbraio, negli anni non bisestili, viene festeggiato il 1° marzo.
- I gruppi compaiono nella dashboard solo **dopo il primo comando** ricevuto al loro interno (è così che il bot ne apprende nome e id).

---

## 🗄️ Schema del database

```jsonc
{
  "bot_status": {
    "connected": true,
    "qrCode": null,              // data URL PNG quando serve il login
    "lastSeen": 1735689600000,
    "state": "ready",            // starting | qr | authenticated | ready | disconnected | error
    "phoneNumber": "39333...",
    "pushName": "WhatsHub"
  },

  // Pubblicato dal bot a ogni avvio: la dashboard lo legge per mostrare
  // l'elenco dei comandi integrati sempre allineato al codice.
  "builtin_commands": {
    "<nome>": {
      "name": "lista",
      "usage": "!lista <nome_lista>",
      "description": "Mostra il contenuto di una lista",
      "aliases": ["!list", "!liste"],
      "category": "liste",        // liste | calendario | utility
      "groupOnly": true,
      "order": 1
    }
  },

  "commands": {
    "<commandId>": {
      "trigger": "meteo",
      "description": "Mostra il meteo",
      "responseType": "static",  // static | script
      "responseText": "Oggi c'è il sole ☀️",
      "enabled": true,
      "usageCount": 12
    }
  },

  // Nonostante il nome del nodo (memoria dello schema iniziale, solo-gruppi),
  // contiene anche le chat private: "type" le distingue. Tutti i comandi
  // lista funzionano in entrambe; "!compleanno" senza menzione, in privato,
  // registra il compleanno di chi scrive. Eventi e citazioni sono annidati
  // qui dentro: sono visibili solo nella chat in cui sono stati creati.
  "groups": {
    "<chatId>": {
      "meta": { "name": "Amici", "type": "group", "participants": 8, "notify": true },
      "lists": {
        "<listName>": {
          "<itemId>": {
            "name": "Pane",
            "addedBy": "39333...@c.us",
            "addedByName": "Marco",
            "completed": false,
            "createdAt": 1735689600000
          }
        }
      },
      "events": {
        "<eventId>": {
          "title": "Cena di Natale",
          "startDate": 1735689600000,
          "endDate": null,
          "description": "Da Luigi, portare il regalo",
          "createdBy": "39333...@c.us",
          "createdByName": "Marco"
        }
      },
      "quotes": {
        "<quoteId>": {
          "text": "Non toccate il mio caffè",
          "author": "Marco",
          "date": 1735689600000,
          "addedBy": "39333...@c.us",
          "addedByName": "Anna"
        }
      }
    }
  },

  "birthdays": {
    "<userId>": { "name": "Marco", "date": "25-12", "addedBy": "39333...@c.us" }
  },

  "logs": {
    "<logId>": {
      "command": "!lista", "args": "spesa",
      "groupId": "...", "groupName": "Amici",
      "authorId": "...", "authorName": "Marco",
      "status": "ok",        // ok | error | unknown | ignored
      "source": "builtin",   // builtin | custom | none
      "timestamp": 1735689600000
    }
  },

  "config": { "lastBirthdayRun": "2026-08-06" }
}
```

> I campi `meta`, `state`, `usageCount`, `addedByName`, `source` e `config` sono estensioni rispetto allo schema minimo: servono a dare alla dashboard nomi leggibili al posto degli id e a evitare invii duplicati.
>
> Lo schema è dichiarato in due file gemelli — [`bot/src/types/models.ts`](bot/src/types/models.ts) e [`dashboard/src/lib/types.ts`](dashboard/src/lib/types.ts). **Se modifichi uno, allinea l'altro.**

---

## 🏗️ Build e deployment

```bash
npm run build          # compila bot + dashboard
npm run typecheck      # verifica i tipi di entrambi i workspace
```

### Bot — VPS / Raspberry Pi

Il bot pilota un browser reale: **non gira su piattaforme serverless** (Vercel, Netlify, Cloud Functions). Serve un processo sempre attivo.

```bash
npm run build:bot
npm run start:bot          # oppure: node bot/dist/index.js
```

Con **PM2**, per riavvio automatico e avvio al boot:

```bash
npm install -g pm2
pm2 start bot/dist/index.js --name whatshub-bot
pm2 save && pm2 startup
```

Su Linux headless può servire installare le dipendenze di Chromium:

```bash
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2
```

### Dashboard — Vercel

```bash
npm run build:dashboard
```

Su Vercel: importa il repo, imposta **Root Directory = `dashboard`** e aggiungi le variabili `NEXT_PUBLIC_*`. La dashboard è interamente statica + client-side: non contiene segreti server.

---

## 🔐 Sicurezza

Alcuni punti su cui vale la pena essere espliciti:

- **`bot/.env` e il service account JSON non vanno mai committati.** Sono già in `.gitignore`, insieme alla cartella `.wwebjs_auth/` — che contiene le credenziali della sessione WhatsApp e vale quanto l'accesso al tuo account.
- **Le chiavi `NEXT_PUBLIC_*` sono pubbliche per definizione**: finiscono nel bundle JavaScript. La protezione dei dati non dipende da loro ma **dalle regole del Realtime Database**.
- **La dashboard non ha autenticazione integrata.** Va bene per l'uso in locale; se la pubblichi online, aggiungi Firebase Authentication (o mettila dietro una VPN / Vercel password protection) e mantieni le regole `auth != null` di `database.rules.json`. Senza questo, l'URL del database è di fatto pubblico.
- **`ALLOW_SCRIPT_COMMANDS`** va lasciato a `false` se più persone possono accedere alla dashboard.
- **whatsapp-web.js non è una libreria ufficiale** di WhatsApp: automatizza WhatsApp Web tramite browser. Usa un numero secondario ed evita invii massivi — l'uso automatizzato può portare al blocco dell'account.
- **Il bot dipende dall'interfaccia di WhatsApp Web**, che cambia senza preavviso. Quando cambia in modo incompatibile il bot si autentica ma non diventa operativo: è il motivo per cui `WA_WEB_VERSION` fissa una versione nota. Se un giorno smette di funzionare senza che tu abbia toccato nulla, è il primo posto dove guardare.

---

## 🧰 Stack

| Componente | Tecnologie |
|---|---|
| **Bot** | Node.js, TypeScript, whatsapp-web.js, firebase-admin, node-cron, qrcode, tsx |
| **Dashboard** | Next.js 15 (App Router), React 19, Tailwind CSS v4, lucide-react, Firebase JS SDK v11 |
| **Database** | Firebase Realtime Database |
| **Monorepo** | npm workspaces, concurrently |

---

## 🩺 Problemi comuni

| Sintomo | Causa e soluzione |
|---|---|
| `Variabile d'ambiente mancante: ...` | Manca `bot/.env` — copialo da `bot/.env.example` |
| `Failed to parse private key` | La chiave inline è malformata. Soluzione rapida: `npm run setup:firebase --workspace bot -- percorso.json`, che usa il file JSON ed elimina il problema |
| `Database URL must point to the root of a Firebase Database` | Hai incollato l'URL della **console web** (quello con `console.firebase.google.com/project/...`, spesso con parametri `utm`/`gclid`) invece dell'URL del database. Quello giusto è `https://<progetto>-default-rtdb.<regione>.firebasedatabase.app`, senza percorso finale. Rilancia `npm run setup:firebase --workspace bot`: rileva la regione da solo |
| `Database lives in a different region` | Regione sbagliata nell'URL. Il messaggio di errore di Firebase contiene il campo `correctUrl` con quello giusto |
| Banner giallo "Firebase non è configurato" | Manca `dashboard/.env.local` — genera con `npm run setup:firebase --workspace dashboard`. Se persiste, riavvia il server dev |
| Dashboard vuota, nessun errore | Le regole del database sono ancora in modalità bloccata: il bot funziona (Admin SDK) ma il browser riceve `Permission denied`. Vedi il passo 5 |
| Il QR non compare nella dashboard | Il bot non è in esecuzione, o punta a un database diverso da quello della dashboard |
| Il QR scade di continuo | Normale: WhatsApp lo ruota ogni ~20s, il bot ne pubblica uno nuovo automaticamente |
| Il bot risulta offline pur girando | L'heartbeat si aggiorna ogni 30s; oltre 2 minuti di silenzio la dashboard lo dà per offline |
| Il bot resta su "Sincronizzazione" e non diventa mai online | `whatsapp-web.js` si è autenticato ma non è riuscito a iniettare il proprio codice nella pagina di WhatsApp Web (ha 30 secondi per farlo, poi lancia `ready timeout`). In questo stato **il bot non riceve messaggi**. Causa quasi sempre una versione di WhatsApp Web incompatibile: aggiorna `WA_WEB_VERSION` in `bot/.env` prendendo una versione recente da [wa-version](https://github.com/wppconnect-team/wa-version/tree/main/html). Il watchdog scrive nei log lo stato reale ogni 60s |
| Puppeteer non trova Chromium | Imposta `PUPPETEER_EXECUTABLE_PATH` su un Chrome già installato |
| Nessun gruppo nella dashboard | I gruppi compaiono dopo il primo comando ricevuto al loro interno (prova `!help`) |
| Un evento creato in un gruppo non compare in un altro | Comportamento voluto: gli eventi sono visibili solo nella chat in cui sono stati creati. Verificalo con `!eventi` nella stessa chat |
| Il bot è online ma non risponde ai **tuoi** comandi | Il bot gira sul tuo stesso numero: WhatsApp non consegna alla libreria i messaggi inviati dall'account collegato, quindi il bot non può sentire il proprio operatore. Imposta `ALLOW_SELF_COMMANDS=true` in `bot/.env`, oppure fai provare il comando a un'altra persona |
| Gli auguri non partono | Verifica che almeno un gruppo abbia le notifiche attive o che `NOTIFY_GROUP_IDS` sia valorizzato |

---

## 📄 Licenza

MIT — usalo come vuoi.
