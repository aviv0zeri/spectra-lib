import * as React from 'react';

import { cn } from '../cn.js';

/**
 * Text input.
 *
 * @param {React.ComponentProps<'input'>} props
 */
function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 rounded-md border border-input bg-secondary px-3 py-2 text-[14px] text-foreground transition-[color,box-shadow] outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-55',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
