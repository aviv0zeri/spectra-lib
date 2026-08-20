import { Plus } from 'lucide-react';

import { cn } from '../cn.js';
import { Button } from './button.jsx';

const ICON_PX = { 'icon-sm': 14, icon: 15, 'icon-lg': 18 };

/**
 * A "create X" affordance: a bare circled + with no visible label — the
 * surrounding page/section says what gets created. `label` becomes the
 * tooltip and accessible name instead of button text.
 *
 * @param {{
 *   label: string,
 *   size?: 'icon-sm' | 'icon' | 'icon-lg',
 *   className?: string,
 *   onClick?: () => void,
 *   disabled?: boolean,
 * }} props
 */
export function CreateButton({ label, size = 'icon-lg', className, ...props }) {
  return (
    <Button
      type="button"
      size={size}
      variant="primary"
      className={cn('rounded-full', className)}
      title={label}
      aria-label={label}
      {...props}
    >
      <Plus size={ICON_PX[size] ?? 16} aria-hidden="true" />
    </Button>
  );
}
