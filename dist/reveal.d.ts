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
import { type RefObject } from 'react';
/**
 * Scroll-reveal for `[data-reveal]` elements within `scopeRef`: staggers
 * them in with a ScrollTrigger fired once the scope is ~88% up the
 * viewport. Re-runs whenever `deps` change, because filtered/paginated
 * content swaps the revealed set out from under a stale ScrollTrigger.
 */
export declare function useReveal(scopeRef: RefObject<HTMLElement | null>, deps?: unknown[]): void;
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
export declare function useIntro(ref: RefObject<HTMLElement | null>): void;
