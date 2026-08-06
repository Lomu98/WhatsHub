import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True se il .env.local è stato compilato: la UI lo usa per mostrare un avviso utile. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId,
);

let cachedApp: FirebaseApp | null = null;
let cachedDb: Database | null = null;

function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  // In dev il Fast Refresh rimonta i moduli: senza questa guardia Firebase
  // lancerebbe "Firebase App named '[DEFAULT]' already exists".
  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getDb(): Database {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase non configurato: copia dashboard/.env.example in dashboard/.env.local e compila i valori.',
    );
  }
  if (!cachedDb) {
    cachedDb = getDatabase(getFirebaseApp());
  }
  return cachedDb;
}
