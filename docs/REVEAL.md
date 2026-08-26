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
