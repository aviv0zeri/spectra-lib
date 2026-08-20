import { useEffect, useState } from 'react';

import { Button } from './button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog.jsx';
import { Input } from './input.jsx';
import { Label } from './label.jsx';

/**
 * Exact name to type — mono chip so the string stands out (GitHub-style).
 * @param {{ name: string, className?: string }} props
 */
function NameChip({ name, className = '' }) {
  return (
    <code
      className={`inline-block rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-[13px] font-semibold tracking-tight text-foreground break-all ${className}`}
    >
      {name}
    </code>
  );
}

/**
 * Render "Type {name} to confirm" with the name as a mono chip.
 * `prompt` may still contain a literal `{name}` placeholder (preferred) or the
 * already-interpolated name string.
 * @param {{ prompt: string, name: string }} props
 */
function TypeNamePrompt({ prompt, name }) {
  const parts = String(prompt || '').split('{name}');
  if (parts.length >= 2) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span>{parts[0]}</span>
        <NameChip name={name} />
        <span>{parts.slice(1).join('{name}')}</span>
      </span>
    );
  }
  // Fallback when the caller already interpolated `{name}` into the string.
  if (name && prompt.includes(name)) {
    const idx = prompt.indexOf(name);
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span>{prompt.slice(0, idx)}</span>
        <NameChip name={name} />
        <span>{prompt.slice(idx + name.length)}</span>
      </span>
    );
  }
  return <span>{prompt}</span>;
}

/**
 * Type-to-confirm danger Dialog, for destructive actions that deserve more
 * friction than a plain confirm/cancel (e.g. deleting something named).
 * Always keeps Dialog mounted so Radix open/close + blur animations work.
 *
 * All copy is caller-supplied — this component has no i18n dependency of its
 * own, so it doesn't assume the consumer has any particular translation
 * system or key set.
 *
 * @param {{
 *   open: boolean,
 *   expectedName: string,
 *   title: string,
 *   lead: string,
 *   note?: string,
 *   prompt: string,
 *   confirmLabel: string,
 *   cancelLabel?: string,
 *   busyLabel?: string,
 *   onClose: () => void,
 *   onConfirm: () => Promise<void> | void,
 * }} props
 */
export default function TypeNameConfirmDialog({
  open,
  expectedName,
  title,
  lead,
  note,
  prompt,
  confirmLabel,
  cancelLabel = 'Cancel',
  busyLabel,
  onClose,
  onConfirm,
}) {
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const expected = String(expectedName || '').trim();
  const nameMatches = Boolean(expected) && confirmName === expected;

  useEffect(() => {
    if (!open) return;
    setConfirmName('');
    setBusy(false);
    setError('');
  }, [open, expected]);

  /** @param {import('react').FormEvent<HTMLFormElement>} ev */
  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!nameMatches || busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String(/** @type {{ message?: string }} */ (err).message || '')
          : '';
      setError(msg || 'Could not complete delete');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v && !busy ? onClose() : null)}>
      <DialogContent
        showCloseButton={!busy}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{lead}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
          {note ? <p className="m-0 text-[13px] text-muted-foreground">{note}</p> : null}
          {expected ? (
            <div className="flex flex-col items-stretch gap-2">
              <p className="m-0 text-center">
                <NameChip name={expected} className="px-3 py-1.5 text-[15px]" />
              </p>
            </div>
          ) : null}
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="type-name-confirm-input">
              <TypeNamePrompt prompt={prompt} name={expected} />
            </Label>
            <Input
              id="type-name-confirm-input"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              placeholder={expected || undefined}
              className="font-mono"
            />
          </div>
          {error ? <p className="m-0 text-[13px] text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant="danger" disabled={busy || !nameMatches}>
              {busy ? busyLabel || confirmLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
