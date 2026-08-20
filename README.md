# gateopen-design-kit

Single source for the color values GateOpen's Dashboard, Website, and
MobileApp are all supposed to agree on. It exists because they didn't: on
2026-08-19, MobileApp's status colors got retuned for a product-feedback pass
and neither web app picked up the change — each of the three had been
hand-maintaining its own copy of values that were meant to be identical.

## What's in here

`src/tokens.js` exports `DARK` and `LIGHT` — the semantic tones (accent,
status colors) each consuming app's own theme file reads from instead of
hardcoding a duplicate. See the comment at the top of that file for exactly
what's included and, just as deliberately, what's left out (surface colors,
Dashboard's accent, radius) and why — those are structural or open-decision
differences between the apps, not drift.

## Consuming it

Each app takes this as a git dependency, not a published registry package:

```json
"gateopen-design-kit": "git+ssh://git@github.com/aviv0zeri/gateopen-design-kit.git#v0.2.0"
```

Pin to a tag, not a branch — a consumer should only pick up a token change
by deliberately bumping the pinned version, the same way any other dependency
upgrade works. Never point at `main` directly.

MobileApp imports `DARK`/`LIGHT` straight into `themePalettes.js`. Dashboard
and Website don't consume JS at the CSS-custom-property layer directly, so
each has a small generator script that reads this package and writes the
handful of `--accent`/`--ok`/`--warn`/`--bad` lines into its own theme.css —
everything else in those files (surfaces, radius, the rest of the palette)
stays hand-maintained locally, on purpose (see above).

## Versioning

Semver, tagged releases. A change here is a deliberate, reviewed step for
every consumer — bump the version, update one app, verify, then update the
next. Nothing pulls from a moving branch.
