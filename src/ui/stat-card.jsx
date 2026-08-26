import { cn } from '../cn.js';

/**
 * Small stat tile — a muted label over a bold value, with an optional leading
 * icon: the "row of small facts" pattern for a detail panel's header (item
 * count, linked entity, current state). Sized to sit several-per-row inside a
 * grid or flex-wrap container; the tile itself stays layout-agnostic.
 *
 * Interactive when it needs to be: pass `onClick` and it renders as a
 * `<button>` with hover/focus affordances; pass `as` to render any other
 * element (e.g. `'a'` with an `href`). Default is a plain `<div>`.
 *
 * @param {{
 *   icon?: import('react').ReactNode,
 *   label: import('react').ReactNode,
 *   value: import('react').ReactNode,
 *   as?: import('react').ElementType,
 *   className?: string,
 * } & import('react').HTMLAttributes<HTMLElement>} props
 */
export function StatCard({ icon, label, value, as, className, ...props }) {
  const Comp = as || (props.onClick ? 'button' : 'div');
  const interactive = Comp !== 'div';
  return (
    <Comp
      data-slot="stat-card"
      {...(Comp === 'button' ? { type: 'button' } : {})}
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-3.5 py-3 text-start',
        interactive &&
          'cursor-pointer transition-colors outline-none hover:border-primary focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
        {icon ? (
          <span className="shrink-0 text-primary [&_svg]:size-3.5" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-[15px] leading-tight font-semibold text-foreground">
        {value}
      </span>
    </Comp>
  );
}
