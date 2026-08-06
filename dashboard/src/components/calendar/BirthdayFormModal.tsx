'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { upsertBirthday } from '@/lib/db';
import type { BirthdayWithId } from '@/lib/types';

/** Accetta 25/12, 25-12, 5.1 e normalizza in "DD-MM". */
function parseBirthdayDate(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  // Anno bisestile come riferimento, così il 29/02 resta valido.
  const daysInMonth = new Date(Date.UTC(2024, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;

  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
}

const EMPTY = { name: '', dateInput: '', userId: '' };

export function BirthdayFormModal({
  open,
  birthday,
  onClose,
}: {
  open: boolean;
  birthday: BirthdayWithId | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      birthday
        ? {
            name: birthday.name,
            dateInput: birthday.date.replace('-', '/'),
            userId: birthday.userId,
          }
        : EMPTY,
    );
  }, [open, birthday]);

  const isEditing = birthday !== null;

  async function handleSubmit() {
    const name = form.name.trim();
    if (!name) {
      setError('Il nome è obbligatorio.');
      return;
    }

    const date = parseBirthdayDate(form.dateInput);
    if (!date) {
      setError('Data non valida. Usa il formato GG/MM (es. 25/12).');
      return;
    }

    // In modifica manteniamo la chiave esistente (di solito un id WhatsApp).
    // In creazione dalla dashboard non abbiamo l'id: ne generiamo uno stabile
    // dal nome, così il record resta modificabile e non duplica.
    const userId = isEditing
      ? birthday.userId
      : form.userId.trim() ||
        `manual_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${date.replace('-', '')}`;

    setSaving(true);
    setError(null);
    try {
      await upsertBirthday(userId, {
        name,
        date,
        addedBy: 'dashboard',
        groupId: birthday?.groupId ?? '',
        createdAt: birthday?.createdAt,
      });
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
      title={isEditing ? `Modifica compleanno` : 'Nuovo compleanno'}
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
          <label className="label" htmlFor="bday-name">
            Nome
          </label>
          <input
            id="bday-name"
            className="input"
            placeholder="Marco Rossi"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="bday-date">
            Data (GG/MM)
          </label>
          <input
            id="bday-date"
            className="input font-mono"
            placeholder="25/12"
            value={form.dateInput}
            onChange={(event) => setForm({ ...form, dateInput: event.target.value })}
          />
          <p className="mt-1.5 text-xs text-zinc-600">
            L&apos;anno non serve: il bot festeggia ogni anno alla stessa data.
          </p>
        </div>

        {!isEditing ? (
          <div>
            <label className="label" htmlFor="bday-id">
              ID WhatsApp <span className="normal-case text-zinc-600">(opzionale)</span>
            </label>
            <input
              id="bday-id"
              className="input font-mono"
              placeholder="393331234567@c.us"
              value={form.userId}
              onChange={(event) => setForm({ ...form, userId: event.target.value })}
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              Se lo lasci vuoto viene generata una chiave dal nome. Compilalo se vuoi che coincida
              con il record creato dal comando <code className="font-mono">!compleanno</code>.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
