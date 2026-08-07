import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Email autorizzate ad accedere alla dashboard. Deve restare in sync con
 * `database.rules.json` (le regole del DB sono la protezione vera — questo
 * controllo lato client serve solo a mostrare subito un messaggio chiaro
 * invece di un mucchio di errori "permission denied").
 */
const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

let cachedAuth: Auth | null = null;

function getAuthInstance(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getAuthInstance(), callback);
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(getAuthInstance(), provider);
}

export async function signOutUser(): Promise<void> {
  await signOut(getAuthInstance());
}
