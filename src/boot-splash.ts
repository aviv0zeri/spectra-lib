/**
 * Removal logic for a native-app-style boot splash (Facebook/Instagram-style:
 * logo on a solid ground, shown before any JS runs, faded into the real app).
 *
 * The splash markup itself CANNOT live here -- it has to paint before this
 * bundle even loads, so it's plain inline HTML/CSS the app pastes directly
 * into its own index.html (see docs/BOOT_SPLASH.md for the template). This
 * is only the timing logic for taking it back down, which is the part that's
 * easy to get subtly wrong (remove too early and it never painted; remove
 * with no minimum hold and a fast load reads as a flash, not a brand
 * moment) and has no reason to differ between apps.
 *
 * Call once from the app's entry point, right after the initial render call:
 *
 *   createRoot(rootEl).render(<App />);
 *   initBootSplash();
 *
 * Expects an element with id="boot-splash" in the DOM, and a CSS class
 * "boot-splash-hide" that fades it out (opacity/pointer-events) -- both
 * defined in the app's own index.html per the template doc, not here.
 */
export function initBootSplash({
  minVisibleMs = 450,
  fadeMs = 250,
}: { minVisibleMs?: number; fadeMs?: number } = {}): void {
  const bootStart = performance.now();
  // Two rAFs, not one: the first fires before the browser has actually
  // painted the app's first frame, the second is after that paint has
  // happened -- so the splash never gets removed a frame before there's
  // real content behind it.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const splash = document.getElementById('boot-splash');
      if (!splash) return;
      const elapsed = performance.now() - bootStart;
      window.setTimeout(
        () => {
          splash.classList.add('boot-splash-hide');
          window.setTimeout(() => splash.remove(), fadeMs);
        },
        Math.max(0, minVisibleMs - elapsed),
      );
    });
  });
}
