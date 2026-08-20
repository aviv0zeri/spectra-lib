import { cn } from '../cn.js';

/**
 * A labeled, threshold-colored progress bar for "N of M used" quotas (API
 * call caps, send limits, storage) — the fill color itself signals how close
 * to the limit the value is, not just the number.
 *
 * @param {{
 *   value: number,
 *   max: number,
 *   label?: import('react').ReactNode,
 *   warnAt?: number,
 *   className?: string,
 * }} props
 */
export function UsageMeter({ value, max, label, warnAt = 0.8, className }) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const fraction = safeMax > 0 ? Math.min(1, Math.max(0, value / safeMax)) : 0;
  const danger = safeMax > 0 && value >= safeMax;
  const warn = !danger && fraction >= warnAt;
  const barColor = danger ? 'var(--bad)' : warn ? 'var(--warn)' : 'var(--ok)';

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
        <span className="ltr-value font-semibold text-foreground">
          {value.toLocaleString()} / {safeMax.toLocaleString()}
        </span>
        {label ? <span className="text-muted-foreground">{label}</span> : null}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--rim)_35%,transparent)]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${fraction * 100}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
