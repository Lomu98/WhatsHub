'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { createCommand, updateCommand } from '@/lib/db';
import type { CommandResponseType, CustomCommandWithId } from '@/lib/types';
import { cx } from '@/lib/utils';

const PLACEHOLDERS = ['{{autore}}', '{{gruppo}}', '{{args}}', '{{data}}', '{{ora}}'];

const EMPTY = {
  trigger: '',
  description: '',
  responseType: 'static' as CommandResponseType,
  responseText: '',
  enabled: true,
};

export function CommandFormModal({
  open,
  command,
  onClose,
}: {
  open: boolean;
  command: CustomCommandWithId | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ricarica il form ogni volta che cambia il comando in modifica (o si apre in creazione).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      command
        ? {
            trigger: command.trigger,
            description: command.description ?? '',
            responseType: command.responseType,
            responseText: command.responseText ?? '',
            enabled: command.enabled,
          }
        : EMPTY,
    );
  }, [open, command]);

  const isEditing = command !== null;

  async function handleSubmit() {
    const trigger = form.trigger.trim().replace(/^!+/, '').toLowerCase();

    if (!trigger) {
      setError('Il trigger è obbligatorio.');
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(trigger)) {
      setError('Il trigger può contenere solo lettere, numeri, trattini e underscore.');
      return;
    }
    if (!form.responseText.trim()) {
      setError(
        form.responseType === 'static'
          ? 'Inserisci il testo della risposta.'
          : 'Inserisci il codice dello script.',
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        trigger,
        description: form.description.trim(),
        responseType: form.responseType,
        responseText: form.responseText,
        enabled: form.enabled,
      };

      if (isEditing) {
        await updateCommand(command.id, payload);
      } else {
        await createCommand(payload);
      }
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Salvataggio fallito, riprova.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Modifica !${command.trigger}` : 'Nuovo comando'}
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
            {saving ? 'Salvataggio…' : isEditing ? 'Salva modifiche' : 'Crea comando'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="trigger">
            Trigger
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-zinc-500">!</span>
            <input
              id="trigger"
              className="input font-mono"
              placeholder="meteo"
              value={form.trigger}
              onChange={(event) => setForm({ ...form, trigger: event.target.value })}
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-600">
            I trigger che coincidono con un comando built-in vengono ignorati: il built-in ha
            sempre la precedenza.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Descrizione
          </label>
          <input
            id="description"
            className="input"
            placeholder="Mostra il meteo di domani"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <p className="mt-1.5 text-xs text-zinc-600">Compare nella guida di !help.</p>
        </div>

        <div>
          <span className="label">Tipo di risposta</span>
          <div className="grid grid-cols-2 gap-2">
            <TypeOption
              active={form.responseType === 'static'}
              title="Statico"
              description="Testo fisso, con variabili"
              onClick={() => setForm({ ...form, responseType: 'static' })}
            />
            <TypeOption
              active={form.responseType === 'script'}
              title="Script"
              description="Codice JS in sandbox"
              onClick={() => setForm({ ...form, responseType: 'script' })}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="responseText">
            {form.responseType === 'static' ? 'Testo della risposta' : 'Codice JavaScript'}
          </label>
          <textarea
            id="responseText"
            className={cx('input min-h-32 resize-y', form.responseType === 'script' && 'font-mono')}
            placeholder={
              form.responseType === 'static'
                ? 'Ciao {{autore}}! Oggi è {{data}} 👋'
                : "return `Numero fortunato: ${random(1, 100)}`;"
            }
            value={form.responseText}
            onChange={(event) => setForm({ ...form, responseText: event.target.value })}
          />

          {form.responseType === 'static' ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  className="rounded bg-[var(--color-surface-2)] px-2 py-1 font-mono text-[11px] text-zinc-400 transition-colors hover:bg-[var(--color-surface-3)] hover:text-zinc-200"
                  onClick={() =>
                    setForm({ ...form, responseText: `${form.responseText}${placeholder}` })
                  }
                >
                  {placeholder}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-200/80">
                Gli script girano in una sandbox <code className="font-mono">node:vm</code> con
                timeout di 1s e senza accesso a rete o filesystem. Sono comunque disattivati finché
                non imposti <code className="font-mono">ALLOW_SCRIPT_COMMANDS=true</code> nel{' '}
                <code className="font-mono">.env</code> del bot. Variabili disponibili:{' '}
                <code className="font-mono">autore, gruppo, args, testo, random(), scegli()</code>.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">Comando attivo</p>
            <p className="text-xs text-zinc-500">Se disattivato, il bot lo ignora.</p>
          </div>
          <Toggle
            checked={form.enabled}
            onChange={(value) => setForm({ ...form, enabled: value })}
            label="Comando attivo"
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

function TypeOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-lg border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-zinc-700 bg-[var(--color-surface-2)] hover:border-zinc-600',
      )}
    >
      <p className={cx('text-sm font-medium', active ? 'text-[var(--color-accent)]' : 'text-zinc-200')}>
        {title}
      </p>
      <p className="text-xs text-zinc-500">{description}</p>
    </button>
  );
}
