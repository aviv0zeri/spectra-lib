import { cn } from '../cn.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.js';

/**
 * The dropdown — a themed picker over the Select primitive, meant to replace
 * a bare native `<select>` everywhere a consuming app offers a choice from a
 * list. A native `<select>`'s open-state panel is OS-drawn (not styleable,
 * often a different width than its trigger, and lands on top of it rather
 * than below), which is what this fixes in one place:
 *
 *   1. **Square.** `rounded-none` on the trigger, the panel and every item.
 *   2. **Below the field.** `position="popper"` + `side="bottom"` puts the
 *      panel under the trigger instead of over it, with collision avoidance
 *      still on so a dropdown near the bottom of the viewport flips up
 *      rather than rendering off-screen.
 *   3. **Same width as the field.** The panel is pinned to
 *      `--radix-select-trigger-width`, the real measured trigger width.
 *
 * RTL comes free from Radix reading direction off the consumer's own
 * DirectionProvider; `align="start"` is a logical edge.
 */

/* Radix rejects an item whose value is the empty string — it reserves `""`
   for "nothing selected", which is what the placeholder renders. Callers
   that want an explicit "None" row need a non-empty stand-in internally,
   mapped back to `''` on the way out. */
const NONE_VALUE = '__none__';

/**
 * `hint` is an optional secondary label shown at the row's end inside the
 * open list only — never in the trigger's selected value (see SelectItem).
 *
 * @typedef {{
 *   value: string,
 *   label: string,
 *   hint?: string,
 * }} DropdownOption
 */

/**
 * @param {{
 *   value?: string,
 *   onValueChange: (value: string) => void,
 *   options: DropdownOption[],
 *   placeholder?: string,
 *   id?: string,
 *   disabled?: boolean,
 *   className?: string,
 *   'aria-label'?: string,
 * }} props
 */
export function Dropdown({
  value = '',
  onValueChange,
  options,
  placeholder,
  id,
  disabled,
  className,
  'aria-label': ariaLabel,
}) {
  // `''` means two different things depending on the caller, and Radix only
  // understands one of them. A form that offers an explicit "none" row wants
  // `''` SELECTED — that row has to be a real item, so it gets the sentinel.
  // A form without one wants `''` to mean "nothing picked yet", and Radix
  // renders the placeholder for exactly one input: the literal empty string.
  const hasNoneOption = options.some((opt) => opt.value === '');
  const selectValue = value === '' && hasNoneOption ? NONE_VALUE : value;

  return (
    <Select
      // Never `undefined` — that would flip Radix from controlled to
      // uncontrolled and the picker would stop following its own state.
      // `''` still counts as controlled.
      value={selectValue}
      onValueChange={(next) => onValueChange(next === NONE_VALUE ? '' : next)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        // w-full, not the primitive's w-fit: a picker sits in a form column
        // and must be the same width as the inputs above and below it.
        className={cn(
          'w-full min-h-10 rounded-md border-input bg-background px-3.5 py-2 text-[13.5px]',
          'text-start',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        side="bottom"
        align="start"
        sideOffset={-1}
        className={cn(
          'rounded-none',
          // The two halves of "same width as the field": w- pins it to the
          // trigger's measured width, and min-w-0 overrides the primitive's
          // own `min-w-[8rem]`, which would otherwise win on a narrow field.
          'w-[var(--radix-select-trigger-width)] min-w-0',
        )}
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.value || NONE_VALUE}
            value={opt.value || NONE_VALUE}
            className="rounded-none text-xs"
            hint={opt.hint}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
