# Reveal (GSAP scroll-reveal + mount intro)

Scroll-triggered stagger reveals for `[data-reveal]` elements and a one-shot
mount-time entrance for `[data-intro]` elements, built on GSAP + ScrollTrigger.
Ships as two parallel implementations of the same attribute contract:

- **`spectra-lib/reveal`** -- the React hooks (`useReveal`, `useIntro`), for
  bundled sites (eliyaWebsite, spectra-website).
- **`spectra-lib/chrome/reveal.js`** -- the vanilla equivalent
  (`SpectraReveal.init/reveal/intro`), for no-bundler sites that load GSAP
  off vendored `<script>` tags (cv, tzlilBagalil, portfolio-family).

Markup written for one works unchanged under the other: an element only
needs `data-reveal` or `data-intro` on it, nothing implementation-specific.

## Adopting this in a new project (read this first if you're an agent)

Publishing this module doesn't retroactively add it anywhere. A brand-new
site gets it only if it's explicitly wired in, the same as any other
spectra-lib module -- there's no auto-propagation. Here's the setup:

**0. Judgment call before writing any code:** is this a public-facing page
(marketing site, storefront, gallery) or an admin/dashboard tool? Reveal
animation belongs on the former. For a dashboard, either skip this module
entirely or limit it to a single one-shot `useIntro` on the page header --
no scroll-triggered reveal on data grids/rows, no parallax. Admins revisit
the same screen hundreds of times a day; replayed motion on every visit is
friction, not polish. This isn't enforced by the code -- it's a call you
have to make per page.

**1. Bundled React/Vite app:**
- Find the current published tag (don't guess or reuse a stale one from
  another project's `package.json` -- check
  `git ls-remote --tags https://github.com/aviv0zeri/spectra-lib` or this
  repo's own tags) and add to `package.json` dependencies:
  `"spectra-lib": "github:aviv0zeri/spectra-lib#<tag>"` and
  `"gsap": "^3.13.0"`.
- If the tag you need was just cut and might not be pushed to GitHub yet,
  verify locally first with
  `npm install "git+file:///path/to/local/spectra-lib#<tag>"` (resolves
  straight from the local repo's git history, no push required) -- confirm
  `npm run build` succeeds, then set `package.json` to the final `github:`
  form for the real commit. The lockfile will keep the `git+file:`
  resolution until someone runs a plain `npm install` after the tag is
  actually pushed; that's expected, not a bug to work around by hand-editing
  the lockfile.
- Import `{ useReveal, useIntro }` from `'spectra-lib/reveal'` and wire them
  into real markup per the usage example below -- hero/landing gets
  `useIntro`, below-the-fold sections and grids get `useReveal`.
- Verify with `npm run build` (and `lint`/`typecheck` if the app has them)
  before calling it done.

**2. No-bundler static site (plain HTML/CSS/JS):**
- Copy `sync-chrome.mjs` from an existing sibling site (`cv/` or
  `portfolio/` are the reference examples) into the new site, adjusted to
  point at wherever `spectra-lib` is checked out relative to it. Run it to
  pull in `chrome/reveal.js` (and `chrome.css`/`dom.js` too, if the new site
  also wants the shared chrome UI -- not required just for reveal).
- Vendor `gsap.min.js` + `ScrollTrigger.min.js` by copying them from
  `portfolio/assets/vendor/` -- that's the pinned canonical copy every
  no-bundler site shares. Don't pull a fresh build from a CDN or npm for an
  individual site; if the vendored version genuinely needs bumping, do that
  deliberately in `portfolio/` first so every no-bundler site stays on the
  same build.
- Add the pre-paint `<head>` failsafe script (template below), the vendored
  `<script defer>` tags in order, `.can-animate` CSS pre-hide rules for
  whatever you're animating, and real `data-reveal`/`data-intro` markup.
- **Update the new site's `deploy.sh` to ship the `assets/` directory it
  just grew**, with content-hash cache-busting on the new `.css`/`.js`
  files -- copy the pattern from `portfolio/deploy.sh` or `tzlilBagalil/deploy.sh`.
  Easy to forget: the page still renders correctly if this is skipped
  (the failsafe guarantees that), but the vendored scripts 404 in
  production and the animation silently never runs.

## Why this is split lib/app for the vanilla side

Same reason as `spectra-lib/boot-splash` (see `docs/BOOT_SPLASH.md`): the
class that pre-hides animated elements has to be added to `<html>` **before
first paint**, which is before any externally-loaded script -- including
this module -- has had a chance to run. So:

- **The pre-paint gate is a small inline `<script>` in the app's own
  `<head>`**, pasted per site (template below) -- identical in every site,
  but it cannot itself live in a loadable file.
- **Everything after that -- registering ScrollTrigger, confirming
  liveness, running the actual reveals/intro, and the failsafes that undo
  the gate if animation never got going -- is centralized**, as
  `spectra-lib/reveal` (React) or `spectra-lib/chrome/reveal.js` (vanilla).

## THE RULE

The page must never depend on an animation to be readable. `gsap.from()`
writes its hidden inline state the instant the tween is created and only
animates out of it on a later frame -- if that frame never comes (background
tab, GSAP blocked, a throttled device), the content stays invisible
permanently unless something forces it back. Every path below ends in a
failsafe that clears the hidden state instead.

## React: `spectra-lib/reveal`

```jsx
import { useRef } from 'react';
import { useReveal, useIntro } from 'spectra-lib/reveal';

function Hero() {
  const heroRef = useRef(null);
  useIntro(heroRef);
  return (
    <section ref={heroRef}>
      <h1 data-intro="title">...</h1>
      <p data-intro="sub">...</p>
    </section>
  );
}

function Gallery({ items, filter }) {
  const gridRef = useRef(null);
  useReveal(gridRef, [filter]); // re-arms when the revealed set changes
  return (
    <div ref={gridRef}>
      {items.map((item) => (
        <Card key={item.id} data-reveal />
      ))}
    </div>
  );
}
```

`gsap` and `gsap/ScrollTrigger` are peer dependencies -- the consuming app's
own install is what's used, not a copy bundled into `spectra-lib`.

## Vanilla: `spectra-lib/chrome/reveal.js`

### 1. `index.html` head (paste before first paint, right after `chrome.css`)

```html
<script>
/* Set BEFORE first paint so animated elements can start hidden without a
   flash of the finished layout. Two failsafes, because a class that hides
   content is a class that can hide it permanently:
   - reduced motion never gets the class at all;
   - if reveal.js has not taken over within 1.5s (GSAP blocked, offline, a
     script error), the class is removed and everything is simply visible.
   The page must never depend on an animation to be readable. */
(function () {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var root = document.documentElement;
    root.classList.add('can-animate');
    setTimeout(function () {
      if (!root.classList.contains('anim-ready')) root.classList.remove('can-animate');
    }, 1500);
  } catch (e) { /* no matchMedia: leave everything visible */ }
})();
</script>
```

The app's own CSS pre-hides under `.can-animate` (e.g.
`.can-animate [data-reveal] { opacity: 0; transform: translateY(26px); }`,
plus a `@media (prefers-reduced-motion: reduce)` belt-and-braces override) --
see portfolio's `portfolio.css` for a working example of that half.

### 2. Script tags, after the vendored GSAP scripts

```html
<script defer src="assets/vendor/gsap.min.js"></script>
<script defer src="assets/vendor/ScrollTrigger.min.js"></script>
<script defer src="assets/js/reveal.js"></script>
<script defer src="assets/js/site.js"></script>
```

### 3. `site.js`, once the targeted DOM exists

```js
SpectraReveal.init(); // registers ScrollTrigger + marks .anim-ready, or stands down
SpectraReveal.intro(document.querySelector('.hero'));
SpectraReveal.reveal(document.querySelector('.grid'));
```

`init()` returns `false` (and removes `.can-animate` itself) when GSAP is
missing or reduced motion is on; `reveal()`/`intro()` stay safe to call
either way -- they re-check and no-op rather than throw.

Each site's own `sync-chrome.mjs` copies `chrome/reveal.js` in from
spectra-lib's local checkout, the same way it already does for
`chrome.css`/`dom.js`.
