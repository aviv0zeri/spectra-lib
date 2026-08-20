import * as React from 'react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';

import { cn } from '../cn.js';

/** @param {React.ComponentProps<typeof SelectPrimitive.Root>} props */
function Select({ ...props }) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

/** @param {React.ComponentProps<typeof SelectPrimitive.Group>} props */
function SelectGroup({ ...props }) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

/** @param {React.ComponentProps<typeof SelectPrimitive.Value>} props */
function SelectValue({ ...props }) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

/**
 * @param {React.ComponentProps<typeof SelectPrimitive.Trigger> & {
 *   size?: 'default' | 'sm',
 * }} props
 */
function SelectTrigger({ className, size = 'default', children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** @param {React.ComponentProps<typeof SelectPrimitive.Content>} props */
function SelectContent({
  className,
  children,
  position = 'item-aligned',
  align = 'center',
  ...props
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            // The `item-aligned` default pins scroll-viewport height to one
            // trigger row; with `position="popper"` (ui/dropdown.jsx's usage)
            // that clamps the whole list to a single visible row, so the
            // height clamp is dropped there and left to
            // `max-h-(--radix-select-content-available-height)` above instead.
            position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/** @param {React.ComponentProps<typeof SelectPrimitive.Label>} props */
function SelectLabel({ className, ...props }) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<typeof SelectPrimitive.Item>} props */
function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // pe/ps, not pr/pl: the reserved gutter belongs on whichever side the
        // check indicator below sits on, which flips with the page direction.
        'relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pe-8 ps-2 text-sm outline-hidden select-none',
        'hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] hover:text-foreground',
        'data-[highlighted]:bg-[color-mix(in_srgb,var(--accent)_28%,transparent)] data-[highlighted]:text-foreground',
        'focus:bg-[color-mix(in_srgb,var(--accent)_28%,transparent)] focus:text-foreground',
        // The currently-selected item gets its own fixed blue, independent of
        // --accent: --accent is per-project (Raptor2's is a neutral chrome
        // gray, not blue), so a project with a non-blue accent would render
        // an invisible-looking "selected" state if this reused that token.
        // A literal Tailwind blue reads as "selected" consistently everywhere.
        'data-[state=checked]:bg-blue-500/15 data-[state=checked]:text-blue-600 dark:data-[state=checked]:text-blue-400',
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute end-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4 text-blue-600 dark:text-blue-400" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/** @param {React.ComponentProps<typeof SelectPrimitive.Separator>} props */
function SelectSeparator({ className, ...props }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>} props */
function SelectScrollUpButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

/** @param {React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>} props */
function SelectScrollDownButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
