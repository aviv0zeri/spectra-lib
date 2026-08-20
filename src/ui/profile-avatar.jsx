import { cn } from '../cn.js';

/** `ops_admin` -> `Ops Admin`-style initials: two words -> first letters of
 * each; one word -> its first two characters. Private to this component --
 * nothing else in either consumer used it standalone. */
function initials(name = '') {
  const raw = String(name || '').trim();
  if (!raw) return '?';
  const parts = raw.includes(' ')
    ? raw.split(/\s+/).filter(Boolean)
    : raw.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}

/**
 * Circular initials avatar for a dashboard operator (Sidebar footer +
 * Profile page). Not for square settlement/host-style avatars.
 *
 * @param {{
 *   name?: string,
 *   size?: 'sm' | 'md' | 'lg',
 *   active?: boolean,
 *   className?: string,
 *   showEditBadge?: boolean,
 * }} props
 */
export function ProfileAvatar({
  name = '?',
  size = 'md',
  active = false,
  className,
  showEditBadge = false,
}) {
  const dim =
    size === 'lg'
      ? 'size-[88px] text-[28px]'
      : size === 'sm'
        ? 'size-8 text-[11px]'
        : 'size-9 text-[12px]';

  return (
    <span
      data-slot="profile-avatar"
      className={cn(
        'relative inline-grid shrink-0 place-items-center motion-safe:animate-[breath-scale_4.5s_ease-in-out_infinite]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-grid place-items-center rounded-full font-semibold tracking-wide',
          'bg-primary text-primary-foreground',
          dim,
          active && 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--bg)]',
        )}
      >
        {initials(name)}
      </span>
      {showEditBadge ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute end-0 bottom-0 grid size-7 place-items-center rounded-full',
            'border border-border bg-card text-foreground shadow-sm',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 16.5V20h3.5L17.8 9.7l-3.5-3.5L4 16.5z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M13.5 6.8l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : null}
    </span>
  );
}
