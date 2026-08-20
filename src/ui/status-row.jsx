import { cn } from '../cn.js';
import StatusDot from './status-dot.js';

/**
 * A StatusDot plus a line of text in a bordered, tinted chip surface — the
 * "collector row" pattern for a card that reports several independent facts
 * (each fact's own module owns its number; this just gives each one a
 * consistent surface instead of a bare line floating in the card).
 *
 * Ported from GateOpen's SettlementHealthCard.jsx, where this exact
 * className string was repeated 4 times inline for 4 different rows.
 *
 * @param {{
 *   ok?: boolean,
 *   color?: string,
 *   children: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export function StatusRow({ ok = false, color, children, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13.5px]',
        'border-[color-mix(in_srgb,var(--rim)_55%,transparent)]',
        'bg-[color-mix(in_srgb,var(--panel2)_60%,transparent)]',
        className,
      )}
    >
      <StatusDot ok={ok} color={color} />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
