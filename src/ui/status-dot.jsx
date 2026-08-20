import { cn } from '../cn.js';

/**
 * A small up/down status indicator dot.
 *
 * `color` is for indicators with more than two states (e.g. idle / dialing /
 * on call / disabled) — pass an explicit CSS color instead of relying on the
 * `ok` boolean's two-state `--ok`/`--bad` default.
 *
 * @param {{ ok?: boolean, className?: string, label?: string, color?: string }} props
 */
export default function StatusDot({ ok = false, className, label, color }) {
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ background: color || (ok ? 'var(--ok)' : 'var(--bad)') }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
