import { refs } from '../config/firebase';
import type { Birthday } from '../types/models';
import { daysUntilBirthday, todayKey } from '../utils/date';

export interface StoredBirthday extends Birthday {
  userId: string;
  daysLeft: number;
}

/** Crea o aggiorna il compleanno di un utente (chiave = id WhatsApp). */
export async function upsertBirthday(params: {
  userId: string;
  name: string;
  date: string;
  addedBy: string;
  groupId?: string;
}): Promise<void> {
  await refs.birthday(params.userId).update({
    name: params.name,
    date: params.date,
    addedBy: params.addedBy,
    groupId: params.groupId ?? null,
    createdAt: Date.now(),
  });
}

async function readAll(): Promise<StoredBirthday[]> {
  const snapshot = await refs.birthdays().get();
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, Birthday>;
  return Object.entries(raw)
    .filter(([, value]) => Boolean(value?.date))
    .map(([userId, value]) => ({
      userId,
      ...value,
      daysLeft: daysUntilBirthday(value.date),
    }));
}

/** Prossimi compleanni ordinati per vicinanza (oggi per primo). */
export async function getUpcomingBirthdays(limit = 10): Promise<StoredBirthday[]> {
  const all = await readAll();
  return all.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, limit);
}

/** Compleanni che cadono oggi (nel fuso configurato). */
export async function getTodayBirthdays(): Promise<StoredBirthday[]> {
  const key = todayKey();
  const all = await readAll();
  // `daysLeft === 0` copre anche il 29/02 spostato al 1° marzo negli anni non bisestili.
  return all.filter((birthday) => birthday.date === key || birthday.daysLeft === 0);
}
