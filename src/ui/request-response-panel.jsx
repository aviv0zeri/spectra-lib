import { cn } from '../cn.js';
import { Badge } from './badge.js';
import { JsonViewer } from './json-viewer.js';
import { Spinner } from './spinner.js';

/**
 * One HTTP exchange, as a console shows it: `METHOD /path` in the header
 * with the response status and duration, and the request/response bodies
 * underneath as collapsible JSON. Extracted from spectra-comms-tester's
 * `RawPanel`, whose one real idea is kept: the tone is derived from the
 * status code, not chosen by the caller — `0`/no status means the backend was
 * unreachable, `<300` ok, `<500` a warning (the caller's own mistake, or a
 * refusal), everything else an error. Pass `tone` to override when a status
 * code isn't the whole story (a `200` whose body says `ok: false`).
 *
 * No `response` at all means the request is still in flight and a spinner
 * is shown. All copy is props.
 *
 * @typedef {'auto' | 'ok' | 'warn' | 'bad' | 'muted' | 'unreachable'} PanelTone
 *
 * @typedef {{
 *   method: string,
 *   path: string,
 *   query?: Record<string, unknown>,
 *   body?: unknown,
 * }} PanelRequest
 *
 * @typedef {{
 *   status?: number,
 *   durationMs?: number,
 *   body?: unknown,
 * }} PanelResponse
 */

/**
 * @param {PanelTone} tone
 * @param {PanelResponse | null | undefined} response
 * @returns {'ok' | 'warn' | 'bad' | 'muted' | 'unreachable' | 'pending'}
 */
export function resolvePanelTone(tone, response) {
  if (tone !== 'auto') return tone;
  if (!response) return 'pending';
  const status = response.status;
  if (!status) return 'unreachable';
  if (status < 300) return 'ok';
  if (status < 500) return 'warn';
  return 'bad';
}

/** @type {Record<ReturnType<typeof resolvePanelTone>, 'default' | 'ok' | 'warn' | 'bad'>} */
const BADGE = {
  ok: 'ok',
  warn: 'warn',
  bad: 'bad',
  unreachable: 'bad',
  muted: 'default',
  pending: 'default',
};

/**
 * @param {{
 *   request: PanelRequest,
 *   response?: PanelResponse | null,
 *   tone?: PanelTone,
 *   collapsed?: boolean,
 *   title?: import('react').ReactNode,
 *   labels?: {
 *     request?: string,
 *     response?: string,
 *     pending?: string,
 *     unreachable?: string,
 *     query?: string,
 *     noBody?: string,
 *   },
 *   collapsedDepth?: number,
 *   className?: string,
 * }} props
 */
export function RequestResponsePanel({
  request,
  response = null,
  tone = 'auto',
  collapsed = false,
  title,
  labels = {},
  collapsedDepth = 2,
  className,
}) {
  const resolved = resolvePanelTone(tone, response);
  const L = {
    request: 'Request',
    response: 'Response',
    pending: 'In flight',
    unreachable: 'Unreachable',
    query: 'Query',
    noBody: 'No body',
    ...labels,
  };
  const hasQuery = request.query && Object.keys(request.query).length > 0;

  return (
    <details
      data-slot="request-response-panel"
      data-tone={resolved}
      open={!collapsed}
      className={cn(
        'group rounded-lg border border-border bg-card text-[13px]',
        resolved === 'bad' || resolved === 'unreachable' ? 'border-destructive/60' : null,
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span
          className="shrink-0 rounded border border-border bg-[var(--panel2)] px-1.5 py-px text-[11px] font-semibold tracking-[0.04em] text-foreground uppercase"
          style={{ fontFamily: 'var(--mono, ui-monospace, monospace)' }}
        >
          {request.method}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-foreground"
          style={{ fontFamily: 'var(--mono, ui-monospace, monospace)' }}
          title={request.path}
        >
          {request.path}
        </span>
        {title ? <span className="text-muted-foreground">{title}</span> : null}
        {resolved === 'pending' ? (
          <Spinner size="sm" label={L.pending}>
            {L.pending}
          </Spinner>
        ) : (
          <Badge variant={BADGE[resolved]}>
            {resolved === 'unreachable' ? L.unreachable : response?.status}
          </Badge>
        )}
        {response && typeof response.durationMs === 'number' ? (
          <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
            {Math.round(response.durationMs)} ms
          </span>
        ) : null}
      </summary>
      <div className="grid gap-2.5 border-t border-border px-3 py-2.5 md:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-1.5">
          <h4 className="m-0 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {L.request}
          </h4>
          {hasQuery ? (
            <JsonViewer
              value={request.query}
              collapsedDepth={collapsedDepth}
              aria-label={L.query}
              className="text-[12px]"
            />
          ) : null}
          {request.body !== undefined ? (
            <JsonViewer value={request.body} collapsedDepth={collapsedDepth} aria-label={L.request} />
          ) : !hasQuery ? (
            <p className="m-0 text-[12.5px] text-muted-foreground">{L.noBody}</p>
          ) : null}
        </section>
        <section className="flex min-w-0 flex-col gap-1.5">
          <h4 className="m-0 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {L.response}
          </h4>
          {response && response.body !== undefined ? (
            <JsonViewer value={response.body} collapsedDepth={collapsedDepth} aria-label={L.response} />
          ) : (
            <p className="m-0 text-[12.5px] text-muted-foreground">
              {resolved === 'pending' ? L.pending : resolved === 'unreachable' ? L.unreachable : L.noBody}
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
