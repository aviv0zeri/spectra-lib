# Initializing a dashboard sidebar

GateOpen's Dashboard is the **reference implementation** for every dashboard
in this design system. When in doubt about any behavior or visual choice, open
`GateOpen/beta/apps/Dashboard/front/src/components/Sidebar.jsx` and copy what
it does. Nothing below is per-app taste — these are the shared rules; a new
project configures *its own nav items* on top of them and changes nothing
else.

## 1. Install

Pin the library by tag in the app's `package.json` (never a branch):

```json
"spectra-lib": "github:aviv0zeri/spectra-lib#v0.8.0"
```

After every bump: `rm -rf node_modules package-lock.json && npm install`.
(`npm install --no-save` does NOT update the lockfile and WILL break CI and
squash-merged deploys — this has caused two real incidents.)

## 2. Import the stylesheets — never copy them

In the app entry (`main.jsx`), in this order:

```js
import './index.css';                   // Tailwind first — fixes @layer order
import 'spectra-lib/styles/theme.css';  // canonical tokens (GateOpen palette)
import 'spectra-lib/styles/chrome.css'; // glass rail, nav glow, dash-* chrome
import './lib/theme.css';               // app-specific extras ONLY
```

- `theme.css` (lib) is the full token set: surfaces, text, accent, ok/warn/bad,
  nav-nest, scrim/shadow, glass glows. Light/dark both included.
  - App with a Settings theme toggle: stamp
    `document.documentElement.dataset.theme = 'dark' | 'light'` on mount
    (GateOpen does this in `App.jsx`); the stamp always wins.
    Dark is the default — stamp `'dark'` when nothing is stored.
  - App without a toggle: stamp nothing; the OS/browser preference applies.
- `chrome.css` (lib) is everything the shared Sidebar expects
  (`.dash-glass`, `.dash-glass-rail`, `.dash-ambient`, `.nav-text-glow*`)
  plus the shared `dash-*` page chrome and bidi helpers (`.ltr-value` family).
- The app's own `lib/theme.css` holds ONLY what is genuinely specific to that
  app (extra tokens like fonts or status colors the lib doesn't define, page
  CSS unique to that app). **If a block exists in the lib stylesheet, delete
  the local copy** — a local duplicate is drift waiting to happen. An app
  keeping its own *palette* (a deliberate identity, e.g. Raptor2's silver,
  Eliya's purple) skips the lib `theme.css` import and keeps its own token
  file — but still imports `chrome.css`.
- Anything added to the app's own CSS goes inside `@layer base` (bare element
  resets) or `@layer components` (classes). An unlayered rule silently beats
  every Tailwind utility — this bug has shipped before.

## 3. The Sidebar wrapper

Each app has exactly one thin wrapper (`src/components/Sidebar.jsx`) that maps
the app's nav model onto `spectra-lib/ui`'s `Sidebar`. Template (this is
GateOpen's, trimmed):

```jsx
import { Settings as SettingsIcon /*, ...icons */ } from 'lucide-react';
import * as UI from 'spectra-lib/ui';

import { CORE_NAV_ITEMS } from '../lib/dashboardNav.js';
import { isRtl, t } from '../lib/i18n.js';

const NAV_ICONS = { /* id -> lucide icon */ };

export default function Sidebar({ activeTab, onTabChange, authUser }) {
  const items = CORE_NAV_ITEMS.map((item) => ({
    id: item.id,
    icon: NAV_ICONS[item.id],
    label: t(item.labelKey),
    active: item.id === activeTab,
    onClick: () => onTabChange(item.id),
    // For a disclosure group instead: omit active/onClick and provide
    // subItems: [{ id, icon, label, active, onClick }, ...]
  }));

  return (
    <UI.Sidebar
      items={items}
      collapsedStorageKey="<app>-nav-collapsed"
      transitionMs={0}
      isRtl={isRtl()}
      ariaLabel={t('nav_core_label')}
      collapseLabel={t('nav_sidebar_collapse')}
      expandLabel={t('nav_sidebar_expand')}
      footer={
        authUser
          ? {
              icon: <UI.ProfileAvatar name={authUser} size="sm" active={activeTab === 'profile'} />,
              tooltip: authUser,
              active: activeTab === 'profile',
              onClick: () => onTabChange('profile'),
              secondary: {
                icon: <SettingsIcon size={16} aria-hidden />,
                tooltip: t('nav_settings'),
                onClick: () => onTabChange('settings'),
              },
            }
          : undefined
      }
    />
  );
}
```

Apps using react-router pass `as: NavLink, to, end` on items instead of
`onClick` (see Raptor2's wrapper).

## 4. The rules (not optional)

1. **Settings is NEVER a rail row.** It lives in the footer as
   `footer.secondary` — the gear icon beside the profile avatar. Keep the
   route registered (`GLOBAL_TABS` still contains `settings`), just not in
   the rail's item list.
2. **Profile opens from the footer avatar**, not from a rail row.
3. **`transitionMs={0}`.** The collapse animation was removed deliberately
   (it read as jank); do not reintroduce it per-app.
4. **One nested group open at a time.** The accordion behavior is built into
   the shared component — never re-implement grouping in the wrapper.
5. **Group headers are toggle-only.** A parent with `subItems` has no page of
   its own; clicking it opens/closes the group and never navigates.
6. **Sub-items render at the same text/icon size as top-level items** (the
   component handles this — indentation alone carries the nesting cue).
7. **Overflow clips.** The nav list does not scroll with a hidden scrollbar;
   items that don't fit are clipped (component behavior — don't wrap the rail
   in your own scroll container).
8. **Unique ids across the whole nav tree** (core items and every group's
   sub-items) so `id === activeTab` alone identifies the active row.
9. **RTL:** pass `isRtl` from the app's i18n; never hard-code direction.

## 5. Version bumps

A spectra-lib change is a deliberate step for every consumer: bump the tag in
each app's `package.json`, clean-reinstall so the lockfile re-resolves, run
that app's typecheck/build, and land it — extraction or a fix is not done
until every eligible consumer imports it (see the repo-wide rule in
CLAUDE.md). Never leave one dashboard on an old pin "for later".
