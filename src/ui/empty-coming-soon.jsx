import { BarChart3 } from 'lucide-react';

import { cn } from '../cn.js';

/**
 * Full-pane "feature coming soon" empty state — icon, headline, short lead.
 * For a tab that exists in nav but is intentionally parked, not for an empty
 * data list ("no messages yet") — use a plain `PageEmpty` for that instead.
 *
 * Expects the consumer's theme to define `--panel`, `--panel2`, `--accent`,
 * `--shadow-cast` and `--tile-sunk` — the last two are derived/computed
 * tokens in GateOpen's theme.css (not raw palette values), so a consumer
 * without them will need to add them before this renders correctly.
 *
 * @param {{
 *   title: import('react').ReactNode,
 *   body?: import('react').ReactNode,
 *   icon?: import('react').ComponentType<{ className?: string, 'aria-hidden'?: boolean }>,
 *   className?: string,
 * }} props
 */
export default function EmptyComingSoon({ title, body, icon: Icon = BarChart3, className }) {
  return (
    <div
      className={cn(
        'flex min-h-[min(52vh,28rem)] flex-1 items-center justify-center px-4 pt-8 pb-10',
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          'flex w-full max-w-md flex-col items-center gap-3.5 rounded-xl border border-border px-7 pt-9 pb-8 text-center',
          'bg-[linear-gradient(165deg,color-mix(in_srgb,var(--panel2)_88%,var(--accent)_12%)_0%,var(--panel)_55%,var(--panel2)_100%)]',
          'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text)_6%,transparent),0_12px_40px_var(--shadow-cast)]',
          'motion-safe:animate-[empty-soon-in_420ms_ease-out]',
        )}
      >
        <div
          className={cn(
            'mb-1 flex size-15 items-center justify-center rounded-[0.875rem] text-primary',
            'border border-[color-mix(in_srgb,var(--accent)_35%,var(--rim))]',
            'bg-[var(--tile-sunk)]',
            'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]',
          )}
          aria-hidden
        >
          <Icon className="size-7 [stroke-width:1.6]" />
        </div>
        <h3 className="m-0 text-xl leading-[1.3] font-semibold tracking-[0.01em] text-foreground">
          {title}
        </h3>
        {body ? (
          <p className="m-0 max-w-[36ch] text-sm leading-[1.55] text-muted-foreground">{body}</p>
        ) : null}
      </div>
    </div>
  );
}
