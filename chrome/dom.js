/**
 * spectra-lib dom -- el() only. Shared verbatim between cv.js and
 * portfolio.js (that's the whole file for each, not a subset). Their
 * get(path) helpers looked identical too, but each is actually closured over
 * that file's own data object (cv.js's `model`, portfolio.js's `D`), not a
 * pure function -- extracting it would mean refactoring call sites across
 * 800-line files for a 4-line utility. Left local on purpose; revisit only if
 * a third consumer needs the same shape.
 *
 * No build step, on purpose -- matches the "open index.html in a browser"
 * philosophy both sites are built around. Each site's own sync-chrome.mjs
 * copies this file in from spectra-lib's local checkout.
 */

/**
 * @param {string} tag
 * @param {{ cls?: string, text?: string, html?: string, attrs?: Record<string, string | number | null | undefined> }} [opts]
 * @param {Array<Node | null | undefined>} [children]
 * @returns {HTMLElement}
 */
function el(tag, opts, children) {
  var n = document.createElement(tag);
  opts = opts || {};
  if (opts.cls) n.className = opts.cls;
  if (opts.text != null) n.textContent = opts.text;
  if (opts.html != null) n.innerHTML = opts.html;
  if (opts.attrs) {
    Object.keys(opts.attrs).forEach(function (k) {
      if (opts.attrs[k] != null) n.setAttribute(k, opts.attrs[k]);
    });
  }
  (children || []).forEach(function (c) {
    if (c) n.appendChild(c);
  });
  return n;
}
