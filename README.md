# spectra-lib

Aviv's personal shared library — reusable components, tokens, and utilities
that span more than one project. Not project-specific: if something built
for one project would also serve another, it belongs here instead of being
hand-duplicated per-project.

## What's in here today

Currently just GateOpen's design tokens (`src/tokens.js`, `DARK`/`LIGHT` —
the semantic tones each of GateOpen's Dashboard/Website/MobileApp reads from
instead of hardcoding a duplicate). It exists because they didn't agree: on
2026-08-19, MobileApp's status colors got retuned for a product-feedback
pass and neither web app picked up the change — each of the three had been
hand-maintaining its own copy of values that were meant to be identical.

See the comment at the top of `tokens.js` for exactly what's included and,
just as deliberately, what's left out (surface colors, Dashboard's accent,
radius) and why — those are structural or open-decision differences between
GateOpen's apps specifically, not drift.

More projects' reusable pieces land here over time, each in its own
subpath/export as they're extracted — this file's job is to stay accurate
to what's actually here, not to promise a shape in advance.

## Consuming it

Each project takes this as a git dependency, not a published registry
package:

```json
"spectra-lib": "github:aviv0zeri/spectra-lib#v0.2.1"
```

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

## Versioning

Semver, tagged releases. A change here is a deliberate, reviewed step for
every consumer — bump the version, update one project, verify, then update
the next. Nothing pulls from a moving branch.
