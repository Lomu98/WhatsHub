import { encodeKey, refs } from '../config/firebase';
import type { ListItem } from '../types/models';
import { normalizeListName } from '../utils/text';

export interface StoredListItem extends ListItem {
  id: string;
}

/** Aggiunge un elemento a una lista di gruppo. Ritorna l'item creato. */
export async function addItem(params: {
  groupId: string;
  listName: string;
  name: string;
  addedBy: string;
  addedByName: string;
}): Promise<StoredListItem> {
  const listKey = normalizeListName(params.listName);
  const ref = refs.groupList(params.groupId, listKey).push();

  const item: ListItem = {
    name: params.name.trim(),
    addedBy: params.addedBy,
    addedByName: params.addedByName,
    completed: false,
    createdAt: Date.now(),
    completedBy: null,
    completedAt: null,
  };

  await ref.set(item);
  return { id: ref.key as string, ...item };
}

/** Legge una lista ordinata per data di inserimento (l'ordine che vede l'utente). */
export async function getItems(groupId: string, listName: string): Promise<StoredListItem[]> {
  const listKey = normalizeListName(listName);
  const snapshot = await refs.groupList(groupId, listKey).get();
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, ListItem>;
  return Object.entries(raw)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

/**
 * Segna come completato l'elemento in posizione `position` (1-based, così come
 * viene numerato nel messaggio di `!lista`).
 */
export async function completeItemByPosition(params: {
  groupId: string;
  listName: string;
  position: number;
  completedBy: string;
}): Promise<StoredListItem | null> {
  const items = await getItems(params.groupId, params.listName);
  const target = items[params.position - 1];
  if (!target) return null;

  const listKey = normalizeListName(params.listName);
  const patch = {
    completed: true,
    completedBy: params.completedBy,
    completedAt: Date.now(),
  };

  await refs.groupList(params.groupId, listKey).child(target.id).update(patch);
  return { ...target, ...patch };
}

/** Svuota completamente una lista. Ritorna quanti elementi sono stati rimossi. */
export async function clearList(groupId: string, listName: string): Promise<number> {
  const items = await getItems(groupId, listName);
  if (items.length === 0) return 0;

  await refs.groupList(groupId, normalizeListName(listName)).remove();
  return items.length;
}

/** Nomi di tutte le liste non vuote di un gruppo. */
export async function getListNames(groupId: string): Promise<string[]> {
  const snapshot = await refs.groupLists(groupId).get();
  if (!snapshot.exists()) return [];
  return Object.keys(snapshot.val() as Record<string, unknown>);
}

/** Aggiorna i metadati della chat, così la dashboard mostra il nome e non l'id. */
export async function syncGroupMeta(params: {
  groupId: string;
  name: string;
  type: 'group' | 'private';
  participants: number;
}): Promise<void> {
  await refs.groupMeta(params.groupId).update({
    name: params.name,
    type: params.type,
    participants: params.participants,
    updatedAt: Date.now(),
  });
}

/** Id "vero" del gruppo a partire dalla chiave codificata usata nel DB. */
export function groupKey(groupId: string): string {
  return encodeKey(groupId);
}
