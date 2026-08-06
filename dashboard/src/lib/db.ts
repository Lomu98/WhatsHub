'use client';

import { push, ref, remove, set, update } from 'firebase/database';
import { getDb } from './firebase';
import type { Birthday, CalendarEvent, CustomCommand, Quote } from './types';

/** Le chiavi RTDB non ammettono `. $ # [ ] /` — stessa normalizzazione del bot. */
export function encodeKey(key: string): string {
  return key.replace(/[.$#[\]/ -]/g, '_');
}

// --- Comandi custom ---------------------------------------------------------

export async function createCommand(command: Omit<CustomCommand, 'createdAt' | 'updatedAt'>) {
  const listRef = ref(getDb(), 'commands');
  await push(listRef, {
    ...command,
    responseText: command.responseText ?? '',
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function updateCommand(id: string, patch: Partial<CustomCommand>) {
  await update(ref(getDb(), `commands/${id}`), { ...patch, updatedAt: Date.now() });
}

export async function toggleCommand(id: string, enabled: boolean) {
  await update(ref(getDb(), `commands/${id}`), { enabled, updatedAt: Date.now() });
}

export async function deleteCommand(id: string) {
  await remove(ref(getDb(), `commands/${id}`));
}

// --- Liste ------------------------------------------------------------------

export async function addListItem(params: {
  groupId: string;
  listName: string;
  name: string;
  addedByName: string;
}) {
  const listRef = ref(getDb(), `groups/${params.groupId}/lists/${encodeKey(params.listName)}`);
  await push(listRef, {
    name: params.name,
    addedBy: 'dashboard',
    addedByName: params.addedByName,
    completed: false,
    createdAt: Date.now(),
    completedBy: null,
    completedAt: null,
  });
}

export async function setItemCompleted(params: {
  groupId: string;
  listName: string;
  itemId: string;
  completed: boolean;
}) {
  const itemRef = ref(
    getDb(),
    `groups/${params.groupId}/lists/${params.listName}/${params.itemId}`,
  );
  await update(itemRef, {
    completed: params.completed,
    completedBy: params.completed ? 'dashboard' : null,
    completedAt: params.completed ? Date.now() : null,
  });
}

export async function deleteListItem(params: { groupId: string; listName: string; itemId: string }) {
  await remove(ref(getDb(), `groups/${params.groupId}/lists/${params.listName}/${params.itemId}`));
}

export async function clearList(groupId: string, listName: string) {
  await remove(ref(getDb(), `groups/${groupId}/lists/${listName}`));
}

export async function setGroupNotify(groupId: string, notify: boolean) {
  await update(ref(getDb(), `groups/${groupId}/meta`), { notify });
}

// --- Compleanni -------------------------------------------------------------

export async function upsertBirthday(userId: string, birthday: Birthday) {
  await set(ref(getDb(), `birthdays/${encodeKey(userId)}`), {
    ...birthday,
    createdAt: birthday.createdAt ?? Date.now(),
  });
}

export async function deleteBirthday(userId: string) {
  await remove(ref(getDb(), `birthdays/${userId}`));
}

// --- Eventi -------------------------------------------------------------
// Annidati sotto la chat che li ospita: /groups/{groupId}/events/{eventId}.
// Creare un evento dalla dashboard richiede quindi scegliere a quale chat
// appartiene, esattamente come per le liste.

export async function createEvent(groupId: string, event: Omit<CalendarEvent, 'createdAt'>) {
  await push(ref(getDb(), `groups/${groupId}/events`), {
    ...event,
    endDate: event.endDate ?? null,
    createdAt: Date.now(),
    createdBy: event.createdBy ?? 'dashboard',
  });
}

export async function updateEvent(groupId: string, eventId: string, patch: Partial<CalendarEvent>) {
  await update(ref(getDb(), `groups/${groupId}/events/${eventId}`), patch);
}

export async function deleteEvent(groupId: string, eventId: string) {
  await remove(ref(getDb(), `groups/${groupId}/events/${eventId}`));
}

// --- Citazioni ------------------------------------------------------------
// Annidate sotto la chat che le ospita: /groups/{groupId}/quotes/{quoteId}.

export async function createQuote(groupId: string, quote: Omit<Quote, 'createdAt' | 'addedBy'>) {
  await push(ref(getDb(), `groups/${groupId}/quotes`), {
    ...quote,
    author: quote.author ?? null,
    addedBy: 'dashboard',
    createdAt: Date.now(),
  });
}

export async function deleteQuote(groupId: string, quoteId: string) {
  await remove(ref(getDb(), `groups/${groupId}/quotes/${quoteId}`));
}

// --- Log --------------------------------------------------------------------

export async function clearLogs() {
  await remove(ref(getDb(), 'logs'));
}
