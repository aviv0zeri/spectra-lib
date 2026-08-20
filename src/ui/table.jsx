import * as React from 'react';

import { cn } from '../cn.js';

/** Table primitive.
 * @param {React.ComponentProps<'table'> & { className?: string }} props */
function Table({ className, ...props }) {
  return (
    <div data-slot="table-wrap" className="w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom border-collapse text-[13.5px]', className)}
        {...props}
      />
    </div>
  );
}

/** @param {React.ComponentProps<'thead'>} props */
function TableHeader({ className, ...props }) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />;
}

/** @param {React.ComponentProps<'tbody'>} props */
function TableBody({ className, ...props }) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

/** @param {React.ComponentProps<'tr'>} props */
function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn('border-b border-border transition-colors', className)}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<'th'>} props */
function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-4 text-start align-middle text-[11.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

/** @param {React.ComponentProps<'td'>} props */
function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn('h-12 px-4 py-2 align-middle text-foreground', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
