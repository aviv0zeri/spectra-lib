# Console primitives (`spectra-lib/ui`)

The five generic pieces a console / guided tester is built from, extracted
2026-09-05 from `spectra-comms-tester`'s hand-rolled `bits.jsx` and
`CardcomTester`'s walkthrough while designing `spectra-service-tester` (the
unified Comms + Payments console that becomes the Spectra Hub prototype).
None of them know what a "delivery", "payment" or "profile" is — that stays
in the consumer. What they know is the shape every such console repeats:
a sequence of steps, an HTTP exchange, a structured value, a trail of
things that happened, and "this is busy".

| Export | What it is |
| --- | --- |
| `Stepper`, `Step` | numbered walkthrough with real procedure states, incl. first-class `unavailable` |
| `JsonViewer` | collapsible JSON tree with copy |
| `RequestResponsePanel`, `resolvePanelTone` | one HTTP exchange, tone derived from the status code |
| `EvidenceTimeline` | time-stamped list of observations with tone and id chips |
| `Spinner` | accessible busy indicator |

Also in this batch: `Dropdown` options (and `SelectItem`) accept a `hint` —
a secondary label at the row's end that never leaks into the trigger's
selected value.

All copy is props (no i18n coupling). Layout uses logical properties only
(`ps-`/`ms-`/`end-`/`text-start`), so RTL comes from the consumer's `dir`.
Nothing animates except the `Spinner` ring, which stops under
`prefers-reduced-motion`.

## Token contract

On top of the shared contract in the README (`bg-card`, `border-border`,
`text-foreground`, `text-muted-foreground`, `bg-primary`,
`text-primary-foreground`, `text-destructive`, `ring-ring`) these read:
`--ok`, `--warn`, `--bad`, `--accent`, `--muted`, `--panel2`, `--void`, and
`--mono` (all defined by `styles/theme.css`).

## `Stepper` / `Step`

```jsx
import { Stepper } from 'spectra-lib/ui';

<Stepper
  aria-label="Walkthrough"
  selectedId={current}
  onSelect={setCurrent}            // omit for a read-only list
  steps={[
    { id: 'profile', label: 'Create/use Comms profile', state: 'done' },
    { id: 'verify',  label: 'Verify', state: 'active', hint: 'Manual button, never polled' },
    { id: 'webhook', label: 'Cardcom webhook reaches Payments',
      state: 'unavailable', reason: 'Webhook intake is disabled in this deployment' },
    { id: 'receipt', label: 'Send receipt', state: 'pending' },
  ]}
/>
```

- `state`: `pending` (default) | `active` | `done` | `failed` | `skipped` |
  `unavailable`. Markers: number / number-on-primary / check / cross / dash /
  ban. `reason` renders only for `unavailable`, in `--warn` — the point is
  to say *why* a step cannot happen here, not to hide it.
- `numbered` (default `true`): a walkthrough is a sequence. Pass `false`
  for a checklist where order carries no meaning.
- `onSelect(id)` makes every row a `<button>`; the active step carries
  `aria-current="step"`, the selected one `aria-pressed`.
- `orientation`: `vertical` (default) | `horizontal`.
- `Step` is exported for custom composition (steps interleaved with their
  own panels): `state`, `index`, `numbered`, `label`, `hint`, `reason`,
  `selected`, `onSelect`, `disabled`.
- Rows carry `data-slot="step"` and `data-state`, for styling and tests.

## `JsonViewer`

```jsx
<JsonViewer value={response.body} collapsedDepth={2} maxHeight={320} />
```

- Objects/arrays fold; the first `collapsedDepth` levels (default 2) start
  open. Folded nodes summarize as `{ 3 keys }` / `[ 2 items ]`.
- Copy writes `JSON.stringify(value, null, 2)`; unserializable values
  (cycles, BigInt) still render, only the copy action degrades and says so
  via `copyFailedLabel`. Labels: `copyLabel`, `copiedLabel`,
  `copyFailedLabel`.
- Renders in `--mono`. Strings `--ok`, numbers `--accent`, `null`/booleans
  `--warn`, keys `--accent`.

## `RequestResponsePanel`

```jsx
<RequestResponsePanel
  request={{ method: 'POST', path: '/checkout-sessions/9c…/verify', query: { project_id } }}
  response={{ status: 200, durationMs: 842, body }}   // omit while in flight
/>
```

- Tone is **derived**, not chosen: no `response` → `pending` (spinner);
  `status` `0`/missing → `unreachable`; `<300` → `ok`; `<500` → `warn`;
  else `bad`. Pass `tone` to override when the code isn't the whole story
  (a `200` whose body says `ok: false`). `resolvePanelTone(tone, response)`
  is exported so a consumer can reuse the same rule for a list row.
- `collapsed` starts the `<details>` closed. `labels` overrides `request`,
  `response`, `pending`, `unreachable`, `query`, `noBody`. `title` adds a
  caption to the header. `collapsedDepth` is passed to both viewers.
- Carries `data-tone` on the root.

## `EvidenceTimeline`

```jsx
<EvidenceTimeline
  emptyLabel="Nothing recorded yet."
  formatTime={(at) => new Date(at).toISOString()}   // default: toLocaleTimeString
  entries={[
    { id: 'e1', at: '2026-09-05T15:30:12Z', label: 'Verify → SUCCEEDED', tone: 'ok',
      ids: { payment_id: '1e2f…', checkout_session_id: '9c…' } },
    { id: 'e2', at: '2026-09-05T15:31:00Z', label: 'Send refused', tone: 'bad',
      detail: 'destination_not_allowlisted' },
  ]}
/>
```

- Presentational only: entries render in the order given (newest-first or
  oldest-first is the consumer's call). `tone`: `ok` | `warn` | `bad` |
  `muted` (default). `ids` become small mono chips so an id can be read
  off without opening a payload. Each `<li>` carries `data-tone`.

## `Spinner`

```jsx
<Spinner size="sm" label="Verifying">Verifying with Cardcom…</Spinner>
```

- `role="status"`, accessible name = `label` (default `Loading`), the ring
  is `aria-hidden`; `children` is the visible caption. `size`: `sm` | `md`
  | `lg`.

## Tests

`npm test` (vitest + Testing Library, jsdom). Test files live next to their
component as `*.test.jsx` and are excluded from the `tsc` build, so nothing
from them reaches `dist/`.
