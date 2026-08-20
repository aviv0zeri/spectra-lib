import { cn } from '../cn.js';

/**
 * A page-local, "old style" list-nav — a plain bordered panel, no blur, no
 * ambient glow, none of the main rail's glass treatment. For a secondary
 * switcher living INSIDE one page's own content area, not a second copy of
 * the app-wide sidebar.
 *
 * @param {{
 *   'aria-label'?: string,
 *   className?: string,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function NestedSidebar({ className, children, ...props }) {
  return (
    <aside
      className={cn(
        'flex max-h-[min(70vh,640px)] flex-col gap-1 overflow-auto rounded-lg border border-border bg-secondary p-2',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

/**
 * @param {{
 *   active?: boolean,
 *   className?: string,
 *   onClick?: () => void,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function NestedSidebarItem({ active = false, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer truncate rounded-md border border-transparent bg-transparent px-2.5 py-2 text-start text-[13.5px] text-foreground',
        'hover:border-border hover:bg-card',
        active &&
          'border-primary bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium hover:border-primary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
