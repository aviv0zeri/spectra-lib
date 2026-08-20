import { cn } from '../cn.js';

/**
 * Bottom-center transient toast — a save/delete confirmation banner.
 *
 * @param {import('react').ComponentProps<'div'> & { error?: boolean }} props
 */
export function Toast({ className, error = false, ...props }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-none border px-4 py-2.5 text-sm text-foreground',
        'bg-secondary',
        error ? 'border-destructive' : 'border-[var(--ok)]',
        className,
      )}
      {...props}
    />
  );
}
