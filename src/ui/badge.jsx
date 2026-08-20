import * as React from 'react';
import { cva } from 'class-variance-authority';
/** @typedef {import('class-variance-authority').VariantProps<typeof badgeVariants>} BadgeVariants */
import { Slot } from 'radix-ui';

import { cn } from '../cn.js';

/**
 * Small status/kind marker.
 *
 * `ok` / `warn` / `bad` map onto the palette's semantic colors so status
 * markers stop being hand-colored per page.
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-[7px] py-[1px] text-[11px] tracking-[0.04em] uppercase',
  {
    variants: {
      variant: {
        default: 'border-border bg-transparent text-muted-foreground',
        ok: 'border-[var(--ok)] bg-transparent text-[var(--ok)]',
        warn: 'border-[var(--warn)] bg-transparent text-[var(--warn)]',
        bad: 'border-destructive bg-transparent text-destructive',
        solid: 'border-primary bg-primary text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * @param {React.ComponentProps<'span'> & BadgeVariants & { asChild?: boolean }} props
 */
function Badge({ className, variant = 'default', asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
