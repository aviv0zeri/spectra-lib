import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';

import { cn } from '../cn.js';

/**
 * Modal dialog. Enter/exit animations + backdrop blur are expected to live in
 * the consumer's global CSS under `[data-slot=dialog-overlay]` /
 * `[data-slot=dialog-content]`; this component only sets structural/layout
 * classes plus the `--scrim` background it expects the consumer to define.
 *
 * Centering uses a full-viewport flex shell (`fixed inset-0 flex items-center
 * justify-center`) so transforms on the panel never fight layout positioning.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

/** @param {React.ComponentProps<typeof DialogPrimitive.Overlay>} props */
function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-[var(--scrim)]', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }} props */
function DialogContent({ className, children, showCloseButton = true, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        data-slot="dialog-center"
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            'pointer-events-auto relative grid w-full max-w-[min(460px,96vw)] gap-4',
            'max-h-[92vh] overflow-y-auto rounded-md border border-border bg-card p-5 text-card-foreground shadow-lg',
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="absolute end-3.5 top-3.5 rounded-sm text-muted-foreground opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
}

/** @param {React.ComponentProps<'div'>} props */
function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-start', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<typeof DialogPrimitive.Title>} props */
function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('m-0 text-[18px] leading-tight font-semibold text-foreground', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<typeof DialogPrimitive.Description>} props */
function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('m-0 text-[13px] leading-[1.5] text-muted-foreground', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<'div'>} props */
function DialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('mt-1 flex flex-wrap items-center justify-end gap-2.5', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
