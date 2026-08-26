import * as React from 'react';
import { Search, X } from 'lucide-react';

import { cn } from '../cn.js';

/**
 * A real search field — leading search icon, a focus treatment that fits
 * this system's glass/glow language (border + soft accent glow, not a plain
 * ring), and a clear (×) button that appears once there's text. Built to
 * replace the fleet's hand-rolled `<input type="search">` variants: a bare
 * `<input type="search">` with no icon (SettlementsPage/AppUsersPage/etc.)
 * and a copy-pasted icon-plus-input pair (AllHostsPage/HostGuestsPage) had
 * drifted into three slightly different shapes across GateOpen alone.
 *
 * RTL: purely logical positioning (`start-`/`end-`/`ps-`/`pe-`), same as the
 * rest of this system (see Sidebar) — the icon and clear button swap sides
 * automatically under an ancestor `dir="rtl"`, no `isRtl` prop needed.
 *
 * Motion: the focus transition only runs under `motion-safe` (same
 * convention as Sidebar's `nav-text-glow` breathing animation) — reduced-
 * motion users get the state change instantly, no animated transition.
 *
 * Controlled only (matches every existing call site): pass `value` +
 * `onChange` like a normal input. The clear button calls `onChange` with a
 * synthetic `{ target: { value: '' } }` (or your own `onClear`, if you need
 * something other than "set the bound value to empty") and returns focus to
 * the field.
 *
 * @param {React.ComponentProps<'input'> & { onClear?: () => void, clearLabel?: string }} props
 */
function SearchInput({ className, value, onChange, onClear, clearLabel = 'Clear', ...props }) {
  const inputRef = React.useRef(/** @type {HTMLInputElement | null} */ (null));
  const hasValue = value != null && String(value).length > 0;

  function handleClear() {
    if (onClear) {
      onClear();
    } else {
      onChange?.(/** @type {any} */ ({ target: { value: '' } }));
    }
    inputRef.current?.focus();
  }

  return (
    <div className={cn('group relative', className)}>
      <Search
        size={15}
        aria-hidden
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground motion-safe:transition-colors motion-safe:duration-200 group-focus-within:text-primary"
      />
      <input
        ref={inputRef}
        type="search"
        data-slot="search-input"
        value={value}
        onChange={onChange}
        className={cn(
          'flex h-10 w-full min-w-0 rounded-md border border-input bg-secondary ps-8 py-2 text-[13.5px] text-foreground outline-none',
          'motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200',
          hasValue ? 'pe-8' : 'pe-3',
          'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent),0_0_16px_-4px_color-mix(in_srgb,var(--accent)_45%,transparent)]',
          'disabled:cursor-not-allowed disabled:opacity-55',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        {...props}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm text-muted-foreground opacity-70 outline-none motion-safe:transition-opacity motion-safe:duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none"
        >
          <X className="size-3.5" />
          <span
            className="sr-only"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {clearLabel}
          </span>
        </button>
      ) : null}
    </div>
  );
}

export { SearchInput };
