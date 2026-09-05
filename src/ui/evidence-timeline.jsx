import { cn } from '../cn.js';
import { PageMessage } from './page-shell.js';
import StatusDot from './status-dot.js';

/**
 * A vertical, time-stamped list of things that happened — the evidence trail
 * a console shows under a run: a request sent, a refusal, a state observed.
 * Each entry has a tone (`ok` / `warn` / `bad` / `muted`), a time, a label,
 * optional detail, and optional identifiers rendered as small mono chips so
 * an id can be read off and pasted without digging into a payload.
 *
 * Purely presentational: the consumer decides what an "entry" is and in what
 * order they arrive (newest-first or oldest-first) — this renders them as
 * given. Times are formatted by `formatTime` (default: `toLocaleTimeString`
 * of the entry's `at`), so a consumer can switch to ISO or relative time
 * without forking the list.
 *
 * @typedef {{
 *   id?: string,
 *   at: string | number | Date,
 *   label: import('react').ReactNode,
 *   tone?: 'ok' | 'warn' | 'bad' | 'muted',
 *   detail?: import('react').ReactNode,
 *   ids?: Record<string, string>,
 * }} EvidenceEntry
 */

/** @type {Record<NonNullable<EvidenceEntry['tone']>, string>} */
const DOT = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  muted: 'var(--muted)',
};

/** @param {string | number | Date} at */
function defaultFormatTime(at) {
  const d = at instanceof Date ? at : new Date(at);
  return Number.isNaN(d.getTime()) ? String(at) : d.toLocaleTimeString();
}

/**
 * @param {{
 *   entries: EvidenceEntry[],
 *   emptyLabel?: import('react').ReactNode,
 *   formatTime?: (at: string | number | Date) => string,
 *   'aria-label'?: string,
 *   className?: string,
 * }} props
 */
export function EvidenceTimeline({
  entries,
  emptyLabel = 'Nothing recorded yet.',
  formatTime = defaultFormatTime,
  'aria-label': ariaLabel,
  className,
}) {
  if (entries.length === 0) {
    return <PageMessage className={className}>{emptyLabel}</PageMessage>;
  }
  return (
    <ol
      data-slot="evidence-timeline"
      aria-label={ariaLabel}
      className={cn('m-0 flex list-none flex-col p-0', className)}
    >
      {entries.map((entry, i) => {
        const tone = entry.tone || 'muted';
        return (
          <li
            key={entry.id || i}
            data-tone={tone}
            className={cn(
              'relative flex gap-3 py-2 ps-1',
              // Hairline connector between dots, drawn on the row so it needs
              // no wrapper and stops naturally at the last entry.
              i < entries.length - 1 &&
                'after:absolute after:top-[22px] after:bottom-[-8px] after:start-[7.5px] after:w-px after:bg-border after:content-[""]',
            )}
          >
            <span className="mt-[7px] shrink-0">
              <StatusDot color={DOT[tone]} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <time
                  dateTime={
                    entry.at instanceof Date ? entry.at.toISOString() : String(entry.at)
                  }
                  className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground"
                  style={{ fontFamily: 'var(--mono, ui-monospace, monospace)' }}
                >
                  {formatTime(entry.at)}
                </time>
                <span
                  className={cn(
                    'text-[13.5px] leading-snug',
                    tone === 'bad' ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {entry.label}
                </span>
              </div>
              {entry.detail ? (
                <div className="text-[12.5px] text-muted-foreground">{entry.detail}</div>
              ) : null}
              {entry.ids && Object.keys(entry.ids).length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {Object.entries(entry.ids).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex max-w-full items-center gap-1 rounded border border-border bg-[var(--panel2)] px-1.5 py-px text-[11px]"
                      style={{ fontFamily: 'var(--mono, ui-monospace, monospace)' }}
                    >
                      <span className="text-muted-foreground">{k}</span>
                      <span className="truncate text-foreground">{v}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
