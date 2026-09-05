import * as React from 'react';
import { ChevronRight, Copy } from 'lucide-react';

import { cn } from '../cn.js';

/**
 * Collapsible JSON tree with a copy button — for showing a request body,
 * an API response, or any structured value inside a console/tester UI
 * without dumping a wall of `<pre>` text. Objects and arrays fold; the top
 * `collapsedDepth` levels start open, deeper ones start closed.
 *
 * Deliberately dependency-free (no syntax-highlighting library): the values
 * a console shows are small, and the whole point is a consistent look across
 * every consumer, which a library's own theme would fight.
 *
 * Copy writes `JSON.stringify(value, null, 2)` to the clipboard. Values that
 * cannot be serialized (cycles, BigInt) still render as a tree — only the copy
 * action degrades, and it says so through `copyFailedLabel` rather than
 * throwing. All copy is props (no i18n coupling).
 *
 * @param {{
 *   value: unknown,
 *   collapsedDepth?: number,
 *   copyLabel?: string,
 *   copiedLabel?: string,
 *   copyFailedLabel?: string,
 *   maxHeight?: string | number,
 *   'aria-label'?: string,
 *   className?: string,
 * }} props
 */
export function JsonViewer({
  value,
  collapsedDepth = 2,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  copyFailedLabel = 'Cannot copy',
  maxHeight,
  'aria-label': ariaLabel,
  className,
}) {
  const [copyState, setCopyState] = React.useState(/** @type {'idle'|'copied'|'failed'} */ ('idle'));

  const onCopy = React.useCallback(async () => {
    try {
      const text = JSON.stringify(value, null, 2);
      if (typeof text !== 'string' || !navigator.clipboard) throw new Error('unavailable');
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 1500);
  }, [value]);

  return (
    <div
      data-slot="json-viewer"
      aria-label={ariaLabel}
      className={cn(
        'relative rounded-md border border-border bg-[var(--panel2)] text-[12.5px] leading-[1.55] text-foreground',
        className,
      )}
    >
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          'absolute end-1.5 top-1.5 z-10 inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground',
          'hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none',
          copyState === 'failed' && 'text-destructive',
        )}
      >
        <Copy className="size-3" aria-hidden="true" />
        {copyState === 'copied' ? copiedLabel : copyState === 'failed' ? copyFailedLabel : copyLabel}
      </button>
      <div
        className="overflow-auto p-2.5 pe-16"
        style={{
          fontFamily: 'var(--mono, ui-monospace, monospace)',
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        }}
      >
        <Node value={value} depth={0} collapsedDepth={collapsedDepth} />
      </div>
    </div>
  );
}

/** @param {unknown} v */
function isObjectLike(v) {
  return typeof v === 'object' && v !== null;
}

/**
 * @param {{
 *   name?: string,
 *   value: unknown,
 *   depth: number,
 *   collapsedDepth: number,
 *   last?: boolean,
 * }} props
 */
function Node({ name, value, depth, collapsedDepth, last = true }) {
  const [open, setOpen] = React.useState(depth < collapsedDepth);
  const comma = last ? null : <span className="text-muted-foreground">,</span>;
  const key =
    name === undefined ? null : (
      <>
        <span className="text-[var(--accent)]">"{name}"</span>
        <span className="text-muted-foreground">: </span>
      </>
    );

  if (!isObjectLike(value)) {
    return (
      <div className="whitespace-pre-wrap break-all" style={{ paddingInlineStart: depth ? 16 : 0 }}>
        {key}
        <Primitive value={value} />
        {comma}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? /** @type {unknown[]} */ (value).map((v, i) => /** @type {[string, unknown]} */ ([String(i), v]))
    : Object.entries(/** @type {Record<string, unknown>} */ (value));
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  if (entries.length === 0) {
    return (
      <div style={{ paddingInlineStart: depth ? 16 : 0 }}>
        {key}
        <span className="text-muted-foreground">
          {openBracket}
          {closeBracket}
        </span>
        {comma}
      </div>
    );
  }

  return (
    <div style={{ paddingInlineStart: depth ? 16 : 0 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center gap-0.5 rounded outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ChevronRight
          aria-hidden="true"
          className={cn('size-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
        />
        {key}
        <span className="text-muted-foreground">{openBracket}</span>
        {!open ? (
          <span className="text-muted-foreground">
            {' '}
            {entries.length} {isArray ? (entries.length === 1 ? 'item' : 'items') : entries.length === 1 ? 'key' : 'keys'}{' '}
            {closeBracket}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          {entries.map(([k, v], i) => (
            <Node
              key={k}
              name={isArray ? undefined : k}
              value={v}
              depth={depth + 1}
              collapsedDepth={collapsedDepth}
              last={i === entries.length - 1}
            />
          ))}
          <div>
            <span className="text-muted-foreground">{closeBracket}</span>
            {comma}
          </div>
        </>
      ) : (
        <span>{comma}</span>
      )}
    </div>
  );
}

/** @param {{ value: unknown }} props */
function Primitive({ value }) {
  if (value === null) return <span className="text-[var(--warn)]">null</span>;
  if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
  if (typeof value === 'string') return <span className="text-[var(--ok)]">"{value}"</span>;
  if (typeof value === 'number' || typeof value === 'bigint')
    return <span className="text-[var(--accent)] tabular-nums">{String(value)}</span>;
  if (typeof value === 'boolean') return <span className="text-[var(--warn)]">{String(value)}</span>;
  return <span className="text-muted-foreground">{String(value)}</span>;
}
