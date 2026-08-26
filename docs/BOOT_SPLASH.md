# Boot splash

A native-app-style splash (Facebook/Instagram-style: logo on a solid ground,
shown before any JS runs, faded into the real app once it's ready) instead of
a blank white flash while the bundle loads.

## Why this is split lib/app instead of one shared component

The splash has to paint before the app's own JS bundle even loads, which
rules out a React component entirely -- by the time React could render one,
the moment it exists to cover is already over. So:

- **The markup/CSS is plain inline HTML pasted into the app's own
  `index.html`**, per app (different logo asset, different brand color)
  Template below.
- **The removal timing is `spectra-lib/boot-splash`'s `initBootSplash()`** --
  identical across every app, easy to get subtly wrong by hand (remove too
  early and nothing had painted yet; no minimum hold and a fast load reads as
  a flash instead of a brand moment), so it's centralized.

## 1. `index.html` template

Paste into `<head>` (adjust colors to the app's own light/dark `--bg`
tokens) and right after `<div id="root">`:

```html
<style>
  html[data-theme='dark'] #boot-splash {
    background: <dark --bg value>;
  }
  html[data-theme='light'] #boot-splash {
    background: <light --bg value>;
  }
  #boot-splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 250ms ease-out;
  }
  #boot-splash img {
    width: 96px;
    height: 96px;
    animation: boot-splash-in 550ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
  }
  #boot-splash.boot-splash-hide {
    opacity: 0;
    pointer-events: none;
  }
  @keyframes boot-splash-in {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    #boot-splash img {
      animation: none;
    }
  }
</style>
```

```html
<div id="boot-splash"><img src="/assets/<app-logo>.png" alt="" /></div>
```

Keyed off the same `data-theme` attribute the app already stamps on
`<html>` on mount (every dashboard in this fleet does this for its own
light/dark handling) -- no separate theme wiring needed.

A wordmark under the logo (optional) goes inside `#boot-splash` as a sibling
of the `<img>`, its own small inline `<style>` rule for color/weight/spacing
matching the app's own header brand-text treatment.

## 2. `main.jsx` / entry point

```js
import { initBootSplash } from 'spectra-lib/boot-splash';

createRoot(rootEl).render(<App />);
initBootSplash(); // defaults: 450ms minimum hold, 250ms fade
```

Pass `{ minVisibleMs, fadeMs }` to override either duration. Both must match
whatever's actually written into the app's own CSS transition/timeout if
changed (`initBootSplash`'s `fadeMs` and the CSS `transition: opacity <ms>`
above should be the same number).
