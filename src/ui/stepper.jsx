import { Ban, Check, Minus, X } from 'lucide-react';

import { cn } from '../cn.js';

/**
 * A numbered walkthrough — the "do these things in order" list a console or
 * guided tester is built around. Extracted from spectra-comms-tester's
 * `Step` (three states: wait / now / done) and generalized with the states a
 * real procedure has: a step can fail, be skipped, or be genuinely
 * unavailable in the current environment — and `unavailable` is a
 * first-class state with its own marker and an optional `reason`, so a UI
 * can say "this cannot happen here yet, and here is why" instead of faking
 * or hiding the step.
 *
 * Numbering is on by default because a walkthrough IS a sequence; pass
 * `numbered={false}` for a status checklist where order carries no meaning.
 *
 * Direction-agnostic: only logical spacing (`ps-`/`ms-`/`text-start`), so
 * RTL comes from the consumer's `dir` attribute with nothing else to set.
 *
 * @typedef {'pending' | 'active' | 'done' | 'failed' | 'skipped' | 'unavailable'} StepState
 *
 * @typedef {{
 *   id: string,
 *   label: import('react').ReactNode,
 *   state?: StepState,
 *   hint?: import('react').ReactNode,
 *   reason?: import('react').ReactNode,
 *   disabled?: boolean,
 * }} StepItem
 */

/** @type {Record<StepState, string>} */
const MARKER = {
  pending: 'border-border bg-transparent text-muted-foreground',
  active: 'border-primary bg-primary text-primary-foreground',
  done: 'border-[var(--ok)] bg-[var(--ok)] text-[var(--void)]',
  failed: 'border-destructive bg-destructive text-[var(--void)]',
  skipped: 'border-dashed border-border bg-transparent text-muted-foreground',
  unavailable: 'border-dashed border-border bg-transparent text-muted-foreground',
};

/** @type {Record<StepState, string>} */
const LABEL = {
  pending: 'text-muted-foreground',
  active: 'text-foreground font-semibold',
  done: 'text-foreground',
  failed: 'text-destructive',
  skipped: 'text-muted-foreground line-through decoration-border',
  unavailable: 'text-muted-foreground',
};

/**
 * @param {{ state: StepState, index: number, numbered: boolean }} props
 */
function Marker({ state, index, numbered }) {
  const icon = 'size-3.5';
  let glyph;
  if (state === 'done') glyph = <Check className={icon} aria-hidden="true" />;
  else if (state === 'failed') glyph = <X className={icon} aria-hidden="true" />;
  else if (state === 'unavailable') glyph = <Ban className={icon} aria-hidden="true" />;
  else if (state === 'skipped') glyph = <Minus className={icon} aria-hidden="true" />;
  else glyph = numbered ? <span className="tabular-nums">{index + 1}</span> : null;
  return (
    <span
      data-slot="step-marker"
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[11.5px] leading-none font-semibold',
        MARKER[state],
      )}
    >
      {glyph}
    </span>
  );
}

/**
 * One row of a `Stepper`. Exported so a consumer can compose a custom list
 * (e.g. steps interleaved with their own panels) without re-deriving the
 * marker/tone rules.
 *
 * @param {{
 *   state?: StepState,
 *   index?: number,
 *   numbered?: boolean,
 *   label: import('react').ReactNode,
 *   hint?: import('react').ReactNode,
 *   reason?: import('react').ReactNode,
 *   selected?: boolean,
 *   onSelect?: () => void,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export function Step({
  state = 'pending',
  index = 0,
  numbered = true,
  label,
  hint,
  reason,
  selected = false,
  onSelect,
  disabled = false,
  className,
}) {
  const interactive = typeof onSelect === 'function';
  const Comp = interactive ? 'button' : 'div';
  return (
    <Comp
      data-slot="step"
      data-state={state}
      {...(interactive
        ? { type: 'button', onClick: onSelect, disabled, 'aria-pressed': selected }
        : {})}
      aria-current={state === 'active' ? 'step' : undefined}
      className={cn(
        'flex w-full min-w-0 items-start gap-3 rounded-md px-2 py-1.5 text-start',
        interactive &&
          'cursor-pointer transition-colors outline-none hover:bg-[color-mix(in_srgb,var(--panel2)_60%,transparent)] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60',
        selected && 'bg-[color-mix(in_srgb,var(--panel2)_80%,transparent)]',
        className,
      )}
    >
      <Marker state={state} index={index} numbered={numbered} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <span className={cn('text-[13.5px] leading-tight', LABEL[state])}>{label}</span>
        {hint ? <span className="text-[12px] text-muted-foreground">{hint}</span> : null}
        {state === 'unavailable' && reason ? (
          <span
            data-slot="step-reason"
            className="text-[12px] text-[var(--warn)]"
          >
            {reason}
          </span>
        ) : null}
      </span>
    </Comp>
  );
}

/**
 * @param {{
 *   steps: StepItem[],
 *   selectedId?: string,
 *   onSelect?: (id: string) => void,
 *   numbered?: boolean,
 *   orientation?: 'vertical' | 'horizontal',
 *   'aria-label'?: string,
 *   className?: string,
 * }} props
 */
export function Stepper({
  steps,
  selectedId,
  onSelect,
  numbered = true,
  orientation = 'vertical',
  'aria-label': ariaLabel,
  className,
}) {
  const horizontal = orientation === 'horizontal';
  return (
    <ol
      data-slot="stepper"
      data-orientation={orientation}
      aria-label={ariaLabel}
      className={cn(
        'm-0 list-none p-0',
        horizontal ? 'flex flex-wrap gap-x-2 gap-y-1' : 'flex flex-col gap-0.5',
        className,
      )}
    >
      {steps.map((step, index) => (
        <li key={step.id} className={cn('min-w-0', horizontal && 'flex-1 basis-40')}>
          <Step
            state={step.state}
            index={index}
            numbered={numbered}
            label={step.label}
            hint={step.hint}
            reason={step.reason}
            selected={selectedId === step.id}
            disabled={step.disabled}
            onSelect={onSelect ? () => onSelect(step.id) : undefined}
          />
        </li>
      ))}
    </ol>
  );
}
