'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { createQuote } from '@/lib/db';
import { toDatetimeLocal } from '@/lib/utils';

const EMPTY = { text: '', author: '', date: toDatetimeLocal(Date.now()) };

/** Crea una nuova citazione nella chat selezionata. Solo creazione: la modifica del testo non è prevista, si elimina e si ricrea. */
export function QuoteFormModal({
  open,
  groupId,
  onClose,
}: {
  open: boolean;
  groupId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ ...EMPTY, date: toDatetimeLocal(Date.now()) });
  }, [open]);

  async function handleSubmit() {
    const text = form.text.trim();
    if (!text) {
      setError('La citazione non può essere vuota.');
      return;
    }

    const date = new Date(form.date).getTime();
    if (!Number.isFinite(date)) {
      setError('Data non valida.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createQuote(groupId, { text, author: form.author.trim() || null, date });
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
      title="Nuova citazione"
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
          <label className="label" htmlFor="quote-text">
            Citazione
          </label>
          <textarea
            id="quote-text"
            className="input min-h-20 resize-y"
            placeholder="Non toccate il mio caffè"
            value={form.text}
            onChange={(event) => setForm({ ...form, text: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="quote-author">
              Autore <span className="normal-case text-zinc-600">(opzionale)</span>
            </label>
            <input
              id="quote-author"
              className="input"
              placeholder="Marco"
              value={form.author}
              onChange={(event) => setForm({ ...form, author: event.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="quote-date">
              Quando è stata detta
            </label>
            <input
              id="quote-date"
              type="datetime-local"
              className="input"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </div>
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
