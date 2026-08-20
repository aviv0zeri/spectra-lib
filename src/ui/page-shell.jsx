import { cn } from '../cn.js';

/**
 * The standard frame a routed page sits in: page padding, the title/lead
 * header block, the card grid, and the loading/error/empty one-liners.
 *
 * Page padding here is `16px 18px 20px`.
 */

/** @param {{ children?: import('react').ReactNode, className?: string }} props */
export function PageShell({ children, className }) {
  return (
    // Capped width, centered: on wide monitors an uncapped page stretches
    // cards across the full viewport with content hugging one edge.
    <div
      className={cn(
        'mx-auto flex min-h-full w-full max-w-[1280px] flex-col gap-3.5 px-[18px] pt-4 pb-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * @param {{
 *   title: import('react').ReactNode,
 *   lead?: import('react').ReactNode,
 *   actions?: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export function PageHeader({ title, lead, actions, className }) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {/* Actions sit in the title's own row, right after the text, rather
            than floating at the page's far edge with a void between them
            and the title they belong to. */}
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="m-0 text-[22px] leading-tight font-semibold text-foreground">{title}</h2>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        {lead ? (
          <p className="m-0 mt-1 max-w-[72ch] text-[14px] leading-[1.5] text-muted-foreground">
            {lead}
          </p>
        ) : null}
      </div>
    </header>
  );
}

/** Responsive card grid.
 * @param {{ children?: import('react').ReactNode, className?: string, min?: string }} props */
export function PageGrid({ children, className, min = '280px' }) {
  return (
    <div
      className={cn('grid gap-3', className)}
      // auto-fit, not auto-fill: with few cards, auto-fill still reserves the
      // empty tracks it would take to fill the row, so the real card(s) sit
      // pinned to `min` width and truncate instead of using the space.
      // auto-fit collapses those phantom tracks so the actual card(s)
      // stretch to fill the row; the two behave identically once there are
      // enough cards to fill every row.
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` }}
    >
      {children}
    </div>
  );
}

/**
 * Boxed empty state — a dashed frame with centered copy, for empty
 * lists/states and dialogs, where centered text is the standard.
 *
 * Expects the consumer to define a `.dash-empty-box` class (dashed border +
 * spacing) in its own CSS — this component only adds vertical padding and
 * the title/body text on top of it.
 *
 * @param {{
 *   title: import('react').ReactNode,
 *   body?: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export function PageEmpty({ title, body, className }) {
  return (
    <div className={cn('dash-empty-box py-9', className)}>
      <p className="m-0 text-[15px] font-semibold text-foreground">{title}</p>
      {body ? <p className="m-0 mt-1 text-[13.5px]">{body}</p> : null}
    </div>
  );
}

/**
 * The loading / empty / error one-liner.
 *
 * @param {{
 *   children?: import('react').ReactNode,
 *   variant?: 'muted' | 'error' | 'warn' | 'success',
 *   className?: string,
 * }} props
 */
export function PageMessage({ children, variant = 'muted', className }) {
  return (
    <p
      className={cn(
        'm-0 text-[13px]',
        variant === 'error' && 'text-destructive',
        variant === 'warn' && 'text-[var(--warn)]',
        variant === 'success' && 'text-[var(--ok)]',
        variant === 'muted' && 'text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}
