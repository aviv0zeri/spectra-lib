import { DropdownMenu } from 'radix-ui';
import { Ellipsis } from 'lucide-react';

import { cn } from '../cn.js';
import { Button } from './button.jsx';

/**
 * Kebab overflow menu — the home for secondary and destructive row/card
 * actions, so a destructive action doesn't sit as a permanent full-strength
 * button next to the primary one. Direction-aware via the consumer's root
 * DirectionProvider; label is required since the trigger is icon-only.
 *
 * @param {{
 *   label: string,
 *   size?: 'icon-sm' | 'icon',
 *   align?: 'start' | 'end',
 *   className?: string,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function KebabMenu({ label, size = 'icon-sm', align = 'end', className, children }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size}
          className={cn(
            'border-transparent text-muted-foreground hover:text-foreground',
            className,
          )}
          title={label}
          aria-label={label}
        >
          <Ellipsis size={17} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className={cn(
            'z-50 min-w-[170px] rounded-lg border border-border bg-popover p-1 text-popover-foreground',
            'shadow-[0_10px_28px_-12px_rgba(10,16,24,0.35)]',
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * @param {{
 *   variant?: 'default' | 'danger',
 *   className?: string,
 *   onSelect?: (event: Event) => void,
 *   disabled?: boolean,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function KebabMenuItem({ variant = 'default', className, children, ...props }) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-3 text-[13.5px] outline-none select-none',
        'data-[highlighted]:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        variant === 'danger' &&
          'text-destructive data-[highlighted]:bg-[color-mix(in_srgb,var(--bad)_10%,transparent)]',
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenu.Item>
  );
}
