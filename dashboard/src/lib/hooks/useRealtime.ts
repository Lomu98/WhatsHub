'use client';

import { useEffect, useState } from 'react';
import { off, onValue, ref } from 'firebase/database';
import { getDb, isFirebaseConfigured } from '../firebase';

export interface RealtimeState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/**
 * Sottoscrive un nodo del Realtime Database e restituisce il valore grezzo.
 * Il listener viene staccato allo unmount: niente memory leak fra le pagine.
 */
export function useRealtimeValue<T>(path: string, fallback: T): RealtimeState<T> {
  const [state, setState] = useState<RealtimeState<T>>({
    data: fallback,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setState({
        data: fallback,
        loading: false,
        error: new Error('Firebase non configurato'),
      });
      return;
    }

    const nodeRef = ref(getDb(), path);
    const unsubscribe = onValue(
      nodeRef,
      (snapshot) => {
        setState({
          data: (snapshot.val() as T | null) ?? fallback,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setState({ data: fallback, loading: false, error });
      },
    );

    return () => {
      unsubscribe();
      off(nodeRef);
    };
    // `fallback` è volutamente escluso: cambia identità a ogni render se è un
    // literal, e ri-sottoscriverebbe il listener a ogni giro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return state;
}

/**
 * Come `useRealtimeValue`, ma converte l'oggetto `{ key: value }` di RTDB in un
 * array `[{ id, ...value }]` — la forma che serve quasi sempre alla UI.
 *
 * `T` è il tipo *con* l'id già incluso (es. `CustomCommandWithId`): la chiave
 * viene innestata qui, così i componenti non devono fare cast.
 */
export function useRealtimeList<T>(path: string, idKey: string = 'id'): RealtimeState<T[]> {
  const { data, loading, error } = useRealtimeValue<Record<string, unknown> | null>(path, null);

  const list = data
    ? Object.entries(data).map(
        ([key, value]) => ({ ...(value as object), [idKey]: key }) as T,
      )
    : [];

  return { data: list, loading, error };
}
