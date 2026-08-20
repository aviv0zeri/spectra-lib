import { cn } from '../cn.js';
import { Switch } from './switch.js';

/**
 * A labelled on/off control, pairing a `Switch` with its label/description in
 * the standard row layout: label (plus optional description) on the reading
 * edge, switch on the far edge, the whole row a `<label>` so clicking
 * anywhere in it toggles.
 *
 * Prefer this over a pair of "Turn X on" / "Turn X off" buttons or a single
 * button whose label flips — both force the reader to infer the current
 * state backwards from the action offered, which is exactly the ambiguity a
 * switch avoids by showing state directly.
 *
 * @param {{
 *   label: import('react').ReactNode,
 *   description?: import('react').ReactNode,
 *   checked: boolean,
 *   onCheckedChange: (checked: boolean) => void,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export function ToggleField({ label, description, checked, onCheckedChange, disabled, className }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 py-3',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
        {description ? (
          <span className="text-[12px] leading-[1.4] text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}
