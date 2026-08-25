import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '../cn.js';

/**
 * @param {React.ComponentProps<typeof SwitchPrimitive.Root>} props
 */
function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[19px] w-[33px] shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-[15px] rounded-full bg-background shadow-lg ring-0 transition-transform',
          // translate-x is a physical axis, so "on" has to travel the other
          // way in he/ar — otherwise the thumb slides OUT of the track's
          // right edge instead of into it. `rtl:` mirrors both states.
          'data-[state=checked]:translate-x-[15px] data-[state=unchecked]:translate-x-0.5',
          'rtl:data-[state=checked]:-translate-x-[15px] rtl:data-[state=unchecked]:-translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
