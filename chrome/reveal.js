/**
 * spectra-lib reveal (vanilla) -- the no-build equivalent of
 * `spectra-lib/reveal`'s React `useReveal`/`useIntro`, for sites with no
 * bundler that load GSAP + ScrollTrigger straight off vendored
 * `<script>` tags (see portfolio/index.html for the pattern this matches:
 * vendored gsap.min.js + ScrollTrigger.min.js, deferred, non-blocking).
 *
 * No build step, on purpose -- matches dom.js's "open index.html in a
 * browser" philosophy. Each site's own sync-chrome.mjs copies this file in
 * from spectra-lib's local checkout, same as chrome.css/dom.js.
 *
 * THE RULE (shared with the React version, and with the reference
 * implementation this generalizes -- portfolio's assets/js/anim.js): the
 * page must never depend on an animation to be readable.
 *
 * That contract has two halves, split the same way portfolio's does:
 *
 *   1. An inline <script> in the consuming page's own <head>, run BEFORE
 *      first paint, adds `.can-animate` to <html> so CSS can pre-hide the
 *      elements this file animates in -- and arms a 1.5s failsafe that
 *      strips `.can-animate` again if `.anim-ready` never shows up (GSAP
 *      blocked, offline, a script error). This part CANNOT live in this
 *      file: by the time an externally-loaded script runs, first paint has
 *      already happened, so the class has to be added synchronously inline.
 *      See docs/REVEAL.md for the exact snippet to paste (identical to
 *      portfolio's, and to the boot-splash template's split for the same
 *      reason).
 *
 *   2. THIS FILE is loaded after the vendored GSAP scripts, deferred, and
 *      its first job is proving it is alive: call `SpectraReveal.init()`
 *      once, which either registers ScrollTrigger and adds `.anim-ready`
 *      (stopping the head script's failsafe), or -- if GSAP failed to load,
 *      or the visitor asked for reduced motion -- removes `.can-animate`
 *      itself immediately and returns `false`. An animation layer must
 *      never be load-bearing for visibility.
 *
 * `reveal()`/`intro()` drive the same `[data-reveal]` / `[data-intro]`
 * attribute contract the React hooks use, so markup written for one works
 * unchanged under the other. Both are safe to call even if `init()` never
 * ran or stood down -- they re-check reduced-motion/GSAP-availability
 * themselves and no-op rather than throw.
 *
 * Usage (mirrors anim.js's structure, generalized off its hardcoded
 * selectors):
 *
 *   <script defer src="assets/vendor/gsap.min.js"></script>
 *   <script defer src="assets/vendor/ScrollTrigger.min.js"></script>
 *   <script defer src="assets/js/reveal.js"></script>
 *   <script defer src="assets/js/site.js"></script>
 *
 *   // site.js, after the DOM it targets exists:
 *   SpectraReveal.init();
 *   SpectraReveal.intro(document.querySelector('.hero'));
 *   SpectraReveal.reveal(document.querySelector('.grid'));
 */
(function (global) {
  'use strict';

  var FAILSAFE_MS = 1500;

  function shouldSkip() {
    try {
      return (
        document.hidden ||
        global.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    } catch (e) {
      // No matchMedia: behave like reduced motion never applied, and let
      // the gsap-availability check below be the deciding factor.
      return false;
    }
  }

  /** Clear GSAP's inline state so an element falls back to its CSS-natural,
   *  fully visible appearance. */
  function clearInline(scope, selector) {
    if (typeof global.gsap === 'undefined') return;
    var nodes = scope.querySelectorAll(selector);
    if (nodes.length) {
      global.gsap.set(nodes, { clearProps: 'opacity,transform,translate,rotate,scale' });
    }
  }

  /**
   * Gate + readiness handshake for the `.can-animate`/`.anim-ready`
   * failsafe (see file header). Call once, after the vendored GSAP/
   * ScrollTrigger scripts, before `reveal()`/`intro()`.
   *
   * @returns {boolean} whether animation is actually active -- `reveal()`/
   *   `intro()` remain safe to call either way.
   */
  function init() {
    var root = document.documentElement;

    function standDown() {
      root.classList.remove('can-animate');
      root.classList.add('anim-ready'); // stops the head script's failsafe
    }

    if (
      shouldSkip() ||
      typeof global.gsap === 'undefined' ||
      typeof global.ScrollTrigger === 'undefined'
    ) {
      standDown();
      return false;
    }

    global.gsap.registerPlugin(global.ScrollTrigger);
    root.classList.add('anim-ready');

    // Images and webfonts change layout height as they arrive, moving every
    // trigger point below them. Without this, reveals fire at the wrong
    // scroll positions on a first, uncached visit -- and ONLY on a first
    // visit, which makes it a miserable bug to reproduce later.
    global.addEventListener('load', function () {
      global.ScrollTrigger.refresh();
    });

    return true;
  }

  /**
   * Scroll-reveal for `[data-reveal]` elements within `scope`: staggers
   * them in with a ScrollTrigger fired once `scope` is ~88% up the
   * viewport. Call again for the same scope if its revealed content is
   * replaced (e.g. a re-filtered list) -- each call arms its own
   * ScrollTrigger and failsafe independently.
   *
   * @param {Element} scope
   */
  function reveal(scope) {
    if (!scope) return;
    if (shouldSkip() || typeof global.gsap === 'undefined' || typeof global.ScrollTrigger === 'undefined') return;

    var gsap = global.gsap;
    var done = false;

    gsap.from(scope.querySelectorAll('[data-reveal]'), {
      opacity: 0,
      y: 26,
      duration: 0.55,
      ease: 'power2.out',
      stagger: { each: 0.05, from: 'start' },
      onComplete: function () {
        done = true;
      },
      scrollTrigger: {
        trigger: scope,
        start: 'top 88%',
        once: true,
      },
    });

    // Elements below the fold are legitimately still waiting on a scroll,
    // so the failsafe only rescues what is actually on screen and still
    // hidden.
    global.setTimeout(function () {
      if (done) return;
      var first = scope.querySelector('[data-reveal]');
      if (!first) return;
      var box = first.getBoundingClientRect();
      var onScreen = box.top < global.innerHeight && box.bottom > 0;
      if (onScreen && Number(getComputedStyle(first).opacity) < 0.99) {
        clearInline(scope, '[data-reveal]');
      }
    }, FAILSAFE_MS);
  }

  /**
   * One-shot entrance for `[data-intro]` elements within `root`, played
   * once in DOM order. The attribute's value is only ever consumed by the
   * page's own CSS -- this just walks whatever it finds, so any step
   * count/naming works unchanged. The first element gets the larger
   * "headline" travel/duration; everything after overlaps in behind it.
   *
   * @param {Element|Document} root
   */
  function intro(root) {
    if (!root) return;
    if (shouldSkip() || typeof global.gsap === 'undefined') return;

    var steps = root.querySelectorAll('[data-intro]');
    if (!steps.length) return;

    var gsap = global.gsap;
    var done = false;

    var tl = gsap.timeline({
      onComplete: function () {
        done = true;
      },
    });
    Array.prototype.forEach.call(steps, function (step, i) {
      if (i === 0) {
        tl.from(step, { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' });
      } else {
        tl.from(step, { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out' }, '-=0.3');
      }
    });

    // Nothing here waits on scroll -- if it has not finished by now it is stuck.
    global.setTimeout(function () {
      if (!done) clearInline(root, '[data-intro]');
    }, FAILSAFE_MS);
  }

  global.SpectraReveal = { init: init, reveal: reveal, intro: intro };
})(window);
