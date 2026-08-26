import * as React from 'react';

import { cn } from '../cn.js';

/**
 * Multi-line text input — same surface/border/focus treatment as `Input`,
 * sized for a paragraph of content (min-height, vertical resize) rather than
 * one line. Added for GateOpen's message-templates editor (a body field with
 * `{{variable}}` placeholders), but the field itself is fully generic — any
 * consuming app needing a plain multi-line field should reach for this
 * instead of hand-rolling a `<textarea>` with copy-pasted Input classes.
 *
 * @param {React.ComponentProps<'textarea'>} props
 */
function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-md border border-input bg-secondary px-3 py-2 text-[14px] text-foreground transition-[color,box-shadow] outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-55',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'resize-y',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
