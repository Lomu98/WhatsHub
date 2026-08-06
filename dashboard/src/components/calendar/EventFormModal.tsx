'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { createEvent, updateEvent } from '@/lib/db';
import type { CalendarEventWithId } from '@/lib/types';
import { toDatetimeLocal } from '@/lib/utils';

function defaultStart(): string {
  // Default: domani alle 20:00 — l'orario tipico di una cena di gruppo.
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(20, 0, 0, 0);
  return toDatetimeLocal(date.getTime());
}

const EMPTY = { title: '', startDate: '', endDate: '', description: '' };

/**
 * Crea/modifica un evento all'interno di una chat specifica (`groupId`).
 * Gli eventi non sono più globali: vivono sotto /groups/{groupId}/events,
 * quindi il chiamante deve sempre avere una chat selezionata.
 */
export function EventFormModal({
  open,
  groupId,
  event,
  onClose,
}: {
  open: boolean;
  groupId: string;
  event: CalendarEventWithId | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      event
        ? {
            title: event.title,
            startDate: toDatetimeLocal(event.startDate),
            endDate: event.endDate ? toDatetimeLocal(event.endDate) : '',
            description: event.description ?? '',
          }
        : { ...EMPTY, startDate: defaultStart() },
    );
  }, [open, event]);

  const isEditing = event !== null;

  async function handleSubmit() {
    const title = form.title.trim();
    if (!title) {
      setError('Il titolo è obbligatorio.');
      return;
    }

    const startDate = new Date(form.startDate).getTime();
    if (!Number.isFinite(startDate)) {
      setError('Data di inizio non valida.');
      return;
    }

    const endDate = form.endDate ? new Date(form.endDate).getTime() : null;
    if (endDate !== null && !Number.isFinite(endDate)) {
      setError('Data di fine non valida.');
      return;
    }
    if (endDate !== null && endDate < startDate) {
      setError('La data di fine non può essere prima della data di inizio.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = { title, startDate, endDate, description: form.description.trim() };
      if (isEditing) {
        await updateEvent(groupId, event.id, payload);
      } else {
        await createEvent(groupId, payload);
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Salvataggio fallito.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Modifica evento' : 'Nuovo evento'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Annulla
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="event-title">
            Titolo
          </label>
          <input
            id="event-title"
            className="input"
            placeholder="Cena di Natale"
            value={form.title}
            onChange={(eventChange) => setForm({ ...form, title: eventChange.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="event-start">
              Inizio
            </label>
            <input
              id="event-start"
              type="datetime-local"
              className="input"
              value={form.startDate}
              onChange={(eventChange) => setForm({ ...form, startDate: eventChange.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="event-end">
              Fine <span className="normal-case text-zinc-600">(opzionale)</span>
            </label>
            <input
              id="event-end"
              type="datetime-local"
              className="input"
              value={form.endDate}
              onChange={(eventChange) => setForm({ ...form, endDate: eventChange.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="event-description">
            Descrizione
          </label>
          <textarea
            id="event-description"
            className="input min-h-24 resize-y"
            placeholder="Da Luigi, prenotato per 12. Portare il regalo!"
            value={form.description}
            onChange={(eventChange) => setForm({ ...form, description: eventChange.target.value })}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
