import * as React from 'react';
import { cva } from 'class-variance-authority';
/** @typedef {import('class-variance-authority').VariantProps<typeof buttonVariants>} ButtonVariants */
import { Slot } from 'radix-ui';

import { cn } from '../cn.js';

/**
 * The one button primitive. Bordered surface over a dark-metal-style palette
 * rather than shadcn's stock borderless look, so each consuming app doesn't
 * need to restyle every page just to adopt it.
 *
 * Sizing constants here are GateOpen's — the app this was ported from.
 * Other consumers have tuned copies (1px off on `sm`/`lg` text size); if that
 * drift turns out to matter, add a variant rather than re-forking the file.
 */
const buttonVariants = cva(
  "inline-flex max-w-full shrink-0 items-center justify-center gap-2 overflow-hidden rounded-md border text-[13px] font-medium whitespace-nowrap transition-all outline-none [touch-action:manipulation] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border-border bg-secondary text-foreground hover:border-primary hover:text-primary',
        primary:
          'border-primary bg-primary font-semibold text-primary-foreground hover:brightness-110',
        secondary: 'border-border bg-secondary text-foreground hover:border-primary',
        ghost:
          'border-border bg-transparent text-foreground hover:border-primary hover:text-primary',
        danger:
          'border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground',
        outline: 'border-input bg-background hover:border-primary hover:text-primary',
        link: 'border-transparent bg-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-[7px] has-[>svg]:px-3',
        xs: "h-6 gap-1 px-2 text-[11px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'min-h-10 px-[18px] py-[9px] text-[14px] has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * @param {React.ComponentProps<'button'> & ButtonVariants & { asChild?: boolean }} props
 */
function Button({ className, variant = 'default', size = 'default', asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
