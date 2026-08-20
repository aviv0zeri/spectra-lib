# spectra-lib

Aviv's personal shared library — reusable components, tokens, and utilities
that span more than one project. Not project-specific: if something built
for one project would also serve another, it belongs here instead of being
hand-duplicated per-project.

## What's in here today

**`src/tokens.ts`** — GateOpen's design tokens, `DARK`/`LIGHT` semantic tones
each of GateOpen's Dashboard/Website/MobileApp reads from instead of
hardcoding a duplicate. Exists because they didn't agree: on 2026-08-19,
MobileApp's status colors got retuned for a product-feedback pass and neither
web app picked up the change — each of the three had been hand-maintaining
its own copy of values that were meant to be identical. A real npm package
(TypeScript, compiled on install — see "Consuming it" below).

See the comment at the top of `tokens.ts` for exactly what's included and,
just as deliberately, what's left out (surface colors, Dashboard's accent,
radius) and why — those are structural or open-decision differences between
GateOpen's apps specifically, not drift.

**`chrome/`** — cv and portfolio's shared foundation: tokens, aurora, glass,
topbar, and a nav rail (a port of GateOpen Dashboard's `Sidebar.jsx` to plain
CSS). `chrome.css` + `dom.js` (just `el()` — their `get(path)` helpers looked
identical but are each closured over that file's own data object, not pure
functions, so left local). Plain files, no build step, no npm package for
this one — see "Consuming it" for why and how each site pulls it in.

**`src/ui/`** (`spectra-lib/ui`) — the Radix-based dashboard UI component set
(`Button`, `Card`, `Badge`, `Select`, `Table`, `Dialog`, `ConfirmDialog`,
`TypeNameConfirmDialog`, `Input`, `Label`, `Switch`, `ToggleField`,
`Dropdown`, `KebabMenu`, `NestedSidebar`, `Toast`, `CreateButton`,
`UnsupportedDeviceGate`, plus the `PageShell`/`PageHeader`/`PageGrid`/
`PageEmpty`/`PageMessage`/`StatusDot`/`EmptyComingSoon` page-shell pieces),
extracted 2026-08-20 from GateOpen's Dashboard after an audit found the same
~20 files hand-copied, mostly byte-identical, into bagStore, SpectraHub and
Raptor2's Dashboards (each with its own lineage comments pointing back at
GateOpen). `Layout`/`Sidebar`/`ErrorBoundary` were left out on purpose — those
had genuinely diverged in props/behavior per project, not just in styling,
and need a real composition redesign before they're one shared component
rather than a copy that happens to still compile.

These read GateOpen's own semantic Tailwind tokens (`bg-primary`,
`text-foreground`, `bg-card`, `border-border`, plus raw CSS custom properties
like `--ok`/`--warn`/`--bad`/`--accent`/`--scrim`) rather than hardcoding any
palette — every consumer defines its own literal values for those in its own
theme.css, same convention already used for `tokens.ts`'s DARK/LIGHT export.
`EmptyComingSoon` additionally expects `--panel`, `--panel2`, `--shadow-cast`
and `--tile-sunk` (the last two are computed/derived values in GateOpen's
theme.css, not raw palette entries) — a consumer missing those needs to add
them before that component looks right. `TypeNameConfirmDialog` and
`UnsupportedDeviceGate` take all copy as props (`cancelLabel`, `title`,
`body`, ...) rather than reaching into any particular i18n system — the
GateOpen/bagStore originals called a local `t()` helper directly, which this
version deliberately doesn't replicate.

Sizing constants (padding, font sizes) are GateOpen's as-ported; the other
three projects' copies had drifted from GateOpen's by a pixel or two here and
there before this existed — if that drift turns out to matter to a specific
consumer, add a variant, don't re-fork the file.

More projects' reusable pieces land here over time, each in its own
subpath/export as they're extracted — this file's job is to stay accurate
to what's actually here, not to promise a shape in advance.

## Consuming it

Each project takes this as a git dependency, not a published registry
package:

```json
"spectra-lib": "github:aviv0zeri/spectra-lib#v0.3.0"
```

Written in TypeScript, compiled on install. `npm`'s `prepare` lifecycle script
runs automatically for git dependencies specifically (there's no registry-side
build step for those, which is exactly what `prepare` exists for) — so a
consumer's plain `npm install` triggers this package's own `tsc` before the
consumer ever sees it, and `dist/` (gitignored here) is what actually ships.
This is why `.d.ts` type declarations are generated FROM the real
implementation, not hand-maintained alongside it — the earlier all-JS version
of this package shipped a hand-written declaration file that could (and once
almost did) silently drift from the actual exports, which is the exact class
of bug this whole package exists to prevent. Consumers don't need to be
TypeScript themselves — plain JS/JSDoc projects `import` from this normally,
same as any other npm package.

If you set this by hand and then run `npm install`, verify `package-lock.json`'s
`node_modules/spectra-lib` entry actually resolved to the new tag's commit —
npm's git-dependency resolution has a real footgun where a stale lockfile
entry can survive a version-string bump alone. If it's still pointing at an
old commit, force it: `npm install spectra-lib@github:aviv0zeri/spectra-lib#<tag>`.

Pin to a tag, not a branch — a consumer should only pick up a change by
deliberately bumping the pinned version, the same way any other dependency
upgrade works. Never point at `main` directly.

GateOpen's MobileApp imports `DARK`/`LIGHT` straight into its
`themePalettes.js`. Its Dashboard and Website don't consume JS at the
CSS-custom-property layer directly, so each has a small generator script
that reads this package and writes the handful of `--accent`/`--ok`/
`--warn`/`--bad` lines into its own theme.css — everything else in those
files stays hand-maintained locally, on purpose.

### `chrome/` is different: no npm, plain file copy

cv and portfolio have no build step at all, by design (`open index.html in a
browser`) — an npm dependency would be a bigger ask than what they're built
around. Instead, each site has its own `sync-chrome.mjs` (checked into that
site's repo) that copies `chrome/chrome.css` and `chrome/dom.js` in from this
repo's local checkout, assuming sibling directories under the same parent
(true on this machine, not portable elsewhere on purpose — this only ever
needs to run at authoring time, since both sites deploy via `rsync` of
already-authored static files, not CI). Run the site's `sync-chrome.mjs`
after pulling a spectra-lib change, review the diff, commit the result like
any other asset.

## Versioning

Semver, tagged releases. A change here is a deliberate, reviewed step for
every consumer — bump the version, update one project, verify, then update
the next. Nothing pulls from a moving branch.
