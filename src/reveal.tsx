/**
 * GSAP + ScrollTrigger scroll-reveal, extracted verbatim (structurally) from
 * two independently hand-written copies -- eliyaWebsite's and
 * spectra-website's `useReveal`/`useIntro` -- that had drifted only in
 * comment depth and one stagger constant. This is the one both should import
 * instead of carrying their own.
 *
 * THE RULE, learned the hard way and shared with the portfolio site's plain-
 * script equivalent (`spectra-lib/chrome/reveal.js`): the page must never
 * depend on an animation to be readable.
 *
 * `gsap.from()` is not self-protecting the way it looks. It writes the
 * hidden state (opacity:0, a transform) inline the moment the tween is
 * created, then animates out of it on requestAnimationFrame. If those
 * frames never come, the content stays invisible -- permanently. That
 * happens for real:
 *   - the page loads in a BACKGROUND TAB (rAF is throttled to zero there),
 *   - GSAP fails to load, or throws mid-timeline,
 *   - a device/browser starves rAF under load.
 *
 * So: never animate when the document is hidden or the user asked for
 * reduced motion, and always arm a failsafe that strips the inline props if
 * the tween has not finished in time. A drawing that appears without a
 * flourish is fine. A drawing that never appears is not.
 */
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FAILSAFE_MS = 1500;

function shouldSkip(): boolean {
  return (
    document.hidden ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Clear GSAP's inline state so the element falls back to its CSS-natural,
 *  fully visible appearance. */
function clearInline(scope: ParentNode, selector: string): void {
  const nodes = scope.querySelectorAll(selector);
  if (nodes.length) {
    gsap.set(nodes, { clearProps: 'opacity,transform,translate,rotate,scale' });
  }
}

/**
 * Scroll-reveal for `[data-reveal]` elements within `scopeRef`: staggers
 * them in with a ScrollTrigger fired once the scope is ~88% up the
 * viewport. Re-runs whenever `deps` change, because filtered/paginated
 * content swaps the revealed set out from under a stale ScrollTrigger.
 */
export function useReveal(scopeRef: RefObject<HTMLElement | null>, deps: unknown[] = []): void {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;
    if (shouldSkip()) return undefined;

    let done = false;

    const ctx = gsap.context(() => {
      gsap.from('[data-reveal]', {
        opacity: 0,
        y: 26,
        duration: 0.55,
        ease: 'power2.out',
        stagger: { each: 0.05, from: 'start' },
        onComplete: () => {
          done = true;
        },
        scrollTrigger: {
          trigger: scope,
          start: 'top 88%',
          once: true,
        },
      });
    }, scope);

    // ScrollTrigger measures on creation; images that arrive later change the
    // page height underneath it. One refresh after layout settles is enough.
    const settle = window.setTimeout(() => ScrollTrigger.refresh(), 300);

    // Cards below the fold are legitimately still waiting on a scroll, so the
    // failsafe only rescues what is actually on screen and still hidden.
    const failsafe = window.setTimeout(() => {
      if (done) return;
      const first = scope.querySelector('[data-reveal]');
      if (!first) return;
      const box = first.getBoundingClientRect();
      const onScreen = box.top < window.innerHeight && box.bottom > 0;
      if (onScreen && Number(getComputedStyle(first).opacity) < 0.99) {
        clearInline(scope, '[data-reveal]');
      }
    }, FAILSAFE_MS);

    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(failsafe);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * One-shot mount-time entrance for `[data-intro]` elements within `ref`,
 * played once in DOM order. The attribute's value (e.g. `data-intro="name"`,
 * `data-intro="cta"`) is only ever consumed by the page's own CSS -- callers
 * are free to name their steps however their markup wants; this hook just
 * walks whatever it finds. The first element gets the larger "headline"
 * travel/duration, every element after overlaps in behind it -- the same
 * shape both sites' hand-written timelines used, generalized off the
 * specific step count and names each one happened to hardcode.
 */
export function useIntro(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (shouldSkip()) return undefined;

    const steps = Array.from(node.querySelectorAll<HTMLElement>('[data-intro]'));
    if (!steps.length) return undefined;

    let done = false;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          done = true;
        },
      });
      steps.forEach((step, i) => {
        if (i === 0) {
          tl.from(step, { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' });
        } else {
          tl.from(
            step,
            { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out' },
            '-=0.3',
          );
        }
      });
    }, node);

    // Nothing here waits on scroll -- if it has not finished by now it is stuck.
    const failsafe = window.setTimeout(() => {
      if (!done) clearInline(node, '[data-intro]');
    }, FAILSAFE_MS);

    return () => {
      window.clearTimeout(failsafe);
      ctx.revert();
    };
  }, [ref]);
}
