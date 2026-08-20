import * as React from 'react';

import { cn } from '../cn.js';

/**
 * Card surface — panel background, rim border, consistent padding/radius.
 *
 * @param {React.ComponentProps<'div'>} props
 */
function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-md border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<'div'>} props */
function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex items-start justify-between gap-2.5', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<'h3'>} props */
function CardTitle({ className, ...props }) {
  return (
    <h3
      data-slot="card-title"
      className={cn('m-0 text-[15px] leading-tight font-semibold', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<'p'>} props */
function CardDescription({ className, ...props }) {
  return (
    <p
      data-slot="card-description"
      className={cn('m-0 text-[13px] leading-[1.45] text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Trailing slot in the header — an uppercase tag most cards use.
 * @param {React.ComponentProps<'span'>} props */
function CardAction({ className, ...props }) {
  return (
    <span
      data-slot="card-action"
      className={cn(
        'shrink-0 text-[11px] tracking-[0.08em] uppercase text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<'div'>} props */
function CardContent({ className, ...props }) {
  return (
    <div data-slot="card-content" className={cn('flex flex-col gap-2', className)} {...props} />
  );
}

/** @param {React.ComponentProps<'div'>} props */
function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-2.5', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
