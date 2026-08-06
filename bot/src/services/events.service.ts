import { refs } from '../config/firebase';
import type { CalendarEvent } from '../types/models';
import { startOfToday } from '../utils/date';

export interface StoredEvent extends CalendarEvent {
  id: string;
}

/** Crea un evento, visibile solo nella chat (`groupId`) in cui viene creato. */
export async function createEvent(params: {
  groupId: string;
  title: string;
  startDate: number;
  endDate?: number | null;
  description: string;
  createdBy: string;
  createdByName?: string;
}): Promise<StoredEvent> {
  const ref = refs.groupEvents(params.groupId).push();
  const event: CalendarEvent = {
    title: params.title,
    startDate: params.startDate,
    endDate: params.endDate ?? null,
    description: params.description,
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdAt: Date.now(),
  };
  await ref.set(event);
  return { id: ref.key as string, ...event };
}

/**
 * Eventi non ancora conclusi in questa chat, ordinati cronologicamente.
 * Un evento con `endDate` resta "in corso" finché quella data non è passata,
 * anche se `startDate` è già nel passato (utile per eventi su più giorni).
 */
export async function getUpcomingEvents(groupId: string, limit = 10): Promise<StoredEvent[]> {
  const snapshot = await refs.groupEvents(groupId).get();
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, CalendarEvent>;
  const floor = startOfToday();

  return Object.entries(raw)
    .map(([id, value]) => ({ id, ...value }))
    .filter((event) => {
      const relevantDate = event.endDate ?? event.startDate;
      return typeof relevantDate === 'number' && relevantDate >= floor;
    })
    .sort((a, b) => a.startDate - b.startDate)
    .slice(0, limit);
}
