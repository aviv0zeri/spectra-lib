import { LoaderCircle } from 'lucide-react';

import { cn } from '../cn.js';

/**
 * Inline busy indicator — a spinning ring, optionally followed by a line of
 * text. The one piece every console/tester UI kept hand-rolling (a `⋯` span,
 * a CSS keyframe copied per project) because nothing in the set covered
 * "this request is in flight".
 *
 * Accessibility: renders as `role="status"` with `label` as its accessible
 * name (default `Loading`), so screen readers announce it once; the ring
 * itself is `aria-hidden`. Visible text is `children`, kept separate from the
 * accessible name so a consumer can show a short caption without changing
 * what is announced. Respects `prefers-reduced-motion` (the ring stops
 * spinning; it stays visible).
 *
 * @param {{
 *   size?: 'sm' | 'md' | 'lg',
 *   label?: string,
 *   children?: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export function Spinner({ size = 'md', label = 'Loading', children, className }) {
  const ring = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-6' : 'size-4';
  return (
    <span
      data-slot="spinner"
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn('inline-flex items-center gap-2 text-muted-foreground', className)}
    >
      <LoaderCircle
        aria-hidden="true"
        className={cn(ring, 'shrink-0 animate-spin motion-reduce:animate-none')}
      />
      {children ? <span className="text-[13px]">{children}</span> : null}
    </span>
  );
}
