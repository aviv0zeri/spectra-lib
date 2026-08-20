import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '../cn.js';

/** @param {React.ComponentProps<typeof LabelPrimitive.Root>} props */
function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-[13px] leading-none text-muted-foreground select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-55',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
