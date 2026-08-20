import { Monitor, Tablet } from 'lucide-react';

/**
 * True on phones/tablets by device signal (user agent + touch), not by
 * viewport width — a desktop browser resized narrow (or a split-screen
 * window) must still get the real dashboard, only an actual handheld should
 * be gated. iPadOS 13+ reports as "Macintosh" in its UA, so a touch-capable
 * Mac is the only reliable iPad tell left.
 *
 * @returns {'phone' | 'tablet' | 'desktop'}
 */
export function detectDeviceClass() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  // Unambiguous UA tokens first — Android/iPhone strings are decisive on
  // their own. The MacIntel+touch fallback below is last resort only,
  // because navigator.platform can lag behind a spoofed/emulated UA, so it
  // must never outrank a UA that already says plainly what the device is.
  if (/iPad/i.test(ua)) return 'tablet';
  if (/iPhone|iPod/i.test(ua)) return 'phone';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'phone' : 'tablet';
  if (/Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'phone';
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'tablet';
  return 'desktop';
}

/**
 * Full-screen stop for phones/tablets — for a dashboard whose information
 * density (nested nav, wide tables, multi-column forms) was never designed
 * down to a handheld, so this replaces the app shell entirely rather than
 * letting a broken layout through.
 *
 * `title`/`body` are caller-supplied per `kind` (no i18n dependency of its
 * own); `logoSrc` is optional and only rendered when given, since this
 * component doesn't assume any particular asset path.
 *
 * @param {{
 *   kind: 'phone' | 'tablet',
 *   title: import('react').ReactNode,
 *   body: import('react').ReactNode,
 *   logoSrc?: string,
 * }} props
 */
export default function UnsupportedDeviceGate({ kind, title, body, logoSrc }) {
  const Icon = kind === 'tablet' ? Tablet : Monitor;
  return (
    <div className="dash-ambient flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      {logoSrc ? <img className="rounded" src={logoSrc} alt="" width={40} height={40} /> : null}
      <Icon size={30} className="text-muted-foreground" aria-hidden="true" />
      <h1 className="m-0 max-w-[36ch] text-[19px] font-semibold text-foreground">{title}</h1>
      <p className="m-0 max-w-[42ch] text-[14px] leading-normal text-muted-foreground">{body}</p>
    </div>
  );
}
