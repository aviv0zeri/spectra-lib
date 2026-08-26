import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../cn.js';

/**
 * The glass nav rail shared across GateOpen/bagStore/Raptor2's Dashboards.
 * Ported from GateOpen's Sidebar.jsx (the richest of the three — RTL, i18n,
 * disclosure groups); bagStore and Raptor2 independently arrived at the same
 * style constants for the flat-list case, which is the signal this was worth
 * sharing at all.
 *
 * Deliberately navigation-agnostic: GateOpen/bagStore switch tabs via a
 * callback (no router), Raptor2 uses real react-router `NavLink`s. Each item
 * (and the footer) renders as a plain `<button onClick>` by default, or as
 * whatever `as` component you pass (e.g. `NavLink`) with the rest of the
 * item's own props spread onto it — `active` is always caller-supplied
 * rather than detected from the route, so the component doesn't need to know
 * react-router exists.
 *
 * No internal i18n: every label/tooltip is a plain string you already
 * resolved, same convention as TypeNameConfirmDialog/UnsupportedDeviceGate.
 *
 * `className` merges onto the root `<nav>` (later classes win, same as any
 * `cn()` call) — for a shell that places the rail itself via a flex-row
 * parent (every Dashboard), leave it unset. It exists for a page with no
 * such parent (a single-column public site) that needs to override
 * placement entirely, e.g. `position: fixed` pinned to a viewport corner
 * instead of sitting in document flow — see eliyaWebsite's `.rail-corner`.
 *
 * Expects `.dash-glass`, `.dash-glass-rail`, `.nav-text-glow` /
 * `.nav-text-glow-active` (row hover/active transition + text-shadow), plus
 * `--nav-nest-fill` / `--nav-nest-shadow` if any item uses `submenu` (the
 * nested disclosure-group panel). Do NOT hand-copy these into the app:
 * import `spectra-lib/styles/chrome.css` (and `styles/theme.css` for the
 * tokens) — see docs/SIDEBAR.md for the full init guide and the shared
 * sidebar rules.
 */

/**
 * @typedef {{
 *   id: string,
 *   icon?: import('react').ComponentType<{ size?: number, className?: string }>,
 *   label: string,
 *   active?: boolean,
 *   alert?: boolean,
 *   onClick?: () => void,
 *   as?: import('react').ElementType,
 *   submenu?: SidebarNavItem[],
 *   [extraProp: string]: any,
 * }} SidebarNavItem
 */

const NAV_ITEM_BASE =
  'nav-text-glow w-full min-w-0 flex items-center gap-2.5 px-3 py-[10px] text-[14.5px] leading-[1.35] rounded-xl bg-transparent text-foreground text-start overflow-hidden whitespace-nowrap cursor-pointer hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-45 disabled:cursor-not-allowed';
const NAV_ITEM_ACTIVE =
  'nav-text-glow-active bg-[color-mix(in_srgb,var(--accent)_17%,transparent)] text-primary font-semibold shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] motion-safe:animate-[breath-glow_4.5s_ease-in-out_infinite]';
const NAV_SUBITEM_BASE =
  'nav-text-glow w-full min-w-0 flex items-center gap-2.5 px-[10px] py-[10px] text-[14.5px] leading-[1.35] rounded-xl bg-transparent text-foreground text-start overflow-hidden whitespace-nowrap cursor-pointer hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-45 disabled:cursor-not-allowed';
const NAV_ICON_BTN =
  'flex shrink-0 items-center justify-center rounded-lg bg-transparent text-muted-foreground cursor-pointer transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';
const NAV_LABEL_BASE = 'overflow-hidden text-ellipsis whitespace-nowrap';
const NAV_LABEL_EXPANDED = 'max-w-[160px] opacity-100';
const NAV_LABEL_COLLAPSED = 'max-w-0 opacity-0';

/** @param {SidebarNavItem} item */
function hasSubmenu(item) {
  return Array.isArray(item.submenu) && item.submenu.length > 0;
}

/** A small dot pinned to an icon's corner, same shape regardless of rail
 * collapse state -- decorative only (the row's own label/title already
 * carries the accessible name), so it's aria-hidden. The ring matches the
 * rail's own surface rather than being transparent, so it reads as a badge
 * sitting ON the icon instead of a dot that happens to overlap it. */
function AlertDot() {
  return (
    <span
      className="absolute -end-0.5 -top-0.5 block size-2 rounded-full bg-destructive ring-2 ring-[var(--panel)]"
      aria-hidden="true"
    />
  );
}

/**
 * Polymorphic clickable wrapper: renders `as` (any extra props spread on) or
 * a plain button — this is what keeps the rail out of the tab-switch-vs-router
 * decision. Takes fully-built `children` rather than an item shape, so the
 * same wrapper serves both a nav row (icon + label span) and the footer
 * (just an icon/avatar node, no label span).
 * @param {{
 *   as?: import('react').ElementType,
 *   className: string,
 *   onClick?: () => void,
 *   active?: boolean,
 *   label: string,
 *   children: import('react').ReactNode,
 *   rest?: Record<string, any>,
 * }} props
 */
function Interactive({ as: Comp, className, onClick, active, label, children, rest }) {
  if (Comp) {
    return (
      <Comp className={className} aria-label={label} title={label} {...rest}>
        {children}
      </Comp>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * @param {{
 *   items: SidebarNavItem[],
 *   collapsedStorageKey?: string,
 *   isCollapsed?: boolean,
 *   onToggleCollapse?: () => void,
 *   transitionMs?: number,
 *   isRtl?: boolean,
 *   ariaLabel?: string,
 *   collapseLabel?: string,
 *   expandLabel?: string,
 *   groupExpandLabel?: (item: SidebarNavItem, open: boolean) => string,
 *   brand?: import('react').ReactNode,
 *   footer?: {
 *     icon: import('react').ReactNode,
 *     tooltip: string,
 *     active?: boolean,
 *     onClick?: () => void,
 *     as?: import('react').ElementType,
 *     secondary?: {
 *       icon: import('react').ReactNode,
 *       tooltip: string,
 *       onClick?: () => void,
 *       as?: import('react').ElementType,
 *       [extraProp: string]: any,
 *     },
 *     [extraProp: string]: any,
 *   },
 *   className?: string,
 * }} props
 */
export function Sidebar({
  items,
  collapsedStorageKey,
  isCollapsed: isCollapsedProp,
  onToggleCollapse,
  transitionMs = 0,
  isRtl = false,
  ariaLabel = 'Primary',
  collapseLabel = 'Collapse sidebar',
  expandLabel = 'Expand sidebar',
  groupExpandLabel,
  brand,
  footer,
  className,
}) {
  // Collapse state is externally controlled when the caller passes both
  // isCollapsed and onToggleCollapse (e.g. a shell that already owns this
  // state itself, or persists it under a key this component doesn't know
  // about) -- internal state/localStorage below is the default for callers
  // that don't need that, and collapsedStorageKey is only read in that path.
  const externallyControlled = isCollapsedProp !== undefined && onToggleCollapse !== undefined;

  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (externallyControlled || !collapsedStorageKey) return false;
    try {
      return window.localStorage.getItem(collapsedStorageKey) === '1';
    } catch {
      return false;
    }
  });
  const navCollapsed = externallyControlled ? isCollapsedProp : internalCollapsed;

  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef(/** @type {number | null} */ (null));
  useEffect(
    () => () => {
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    },
    [],
  );

  function toggleNavCollapsed() {
    if (externallyControlled) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((v) => {
        const next = !v;
        try {
          if (collapsedStorageKey) {
            window.localStorage.setItem(collapsedStorageKey, next ? '1' : '0');
          }
        } catch {
          // localStorage throws in Safari private browsing / storage-disabled contexts
        }
        return next;
      });
    }
    if (transitionMs > 0) {
      setTransitioning(true);
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = window.setTimeout(() => setTransitioning(false), transitionMs);
    }
  }

  // Disclosure groups (items with a submenu) are an accordion — opening one
  // collapses whichever other group was open, manually or via auto-expand
  // below. At most one group is ever expanded at a time.
  const [expandedGroups, setExpandedGroups] = useState(/** @type {Record<string, boolean>} */ ({}));
  // Collapsing the whole rail to icon-only mode drops whatever group was
  // open -- re-expanding the rail should not resurrect it. navCollapsed
  // itself (not the toggle handler) drives this so it also covers an
  // externally-controlled rail collapsing for a reason other than the
  // handler above (e.g. a caller-driven responsive breakpoint).
  useEffect(() => {
    if (navCollapsed) setExpandedGroups({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navCollapsed]);
  // Object.keys is safe here precisely because at most one group is ever
  // expanded -- see above.
  const openGroupId = Object.keys(expandedGroups)[0];
  const activeGroupIdsKey = items
    .filter(hasSubmenu)
    .filter((g) => (g.submenu ?? []).some((s) => s.active))
    .map((g) => g.id)
    .join(',');
  // Seeded with whatever's already active on the FIRST render, not an empty
  // set — otherwise a page that mounts already inside a group (a deep link,
  // or a refresh on a scoped URL) reads as a "transition into" that group on
  // mount and auto-expands it a beat later, which is a worse first paint
  // than just... rendering collapsed like every other load. Only a genuine
  // transition WHILE mounted (a click, a nav) should trigger the expand.
  const activeGroupIdsRef = useRef(
    /** @type {Set<string>} */ (new Set(activeGroupIdsKey ? activeGroupIdsKey.split(',') : [])),
  );
  useEffect(() => {
    const current = new Set(activeGroupIdsKey ? activeGroupIdsKey.split(',') : []);
    const prev = activeGroupIdsRef.current;
    const newlyActive = [...current].filter((id) => !prev.has(id));
    activeGroupIdsRef.current = current;
    if (newlyActive.length === 0) return;
    setExpandedGroups(() => {
      // Not a spread of the previous state -- a newly-active group replaces
      // whatever was open, same as a manual click does below.
      const next = /** @type {Record<string, boolean>} */ ({});
      for (const id of newlyActive) next[id] = true;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupIdsKey]);

  const RailCollapseIcon = isRtl ? PanelRightClose : PanelLeftClose;
  const RailExpandIcon = isRtl ? PanelRightOpen : PanelLeftOpen;
  const transitionClass =
    transitionMs > 0
      ? `transition-[width] duration-[${transitionMs}ms] ease-out [will-change:width]`
      : '';
  // Labels fade/collapse in sync with the rail width -- without this they'd
  // snap instantly while the rail itself animates over transitionMs, which
  // reads as broken rather than snappy.
  const labelTransitionClass =
    transitionMs > 0 ? `transition-[max-width,opacity] duration-[${transitionMs}ms]` : '';

  /** @param {SidebarNavItem} item, @param {boolean} sub */
  function renderRow(item, sub) {
    const { id, icon: Icon, label, active, alert, onClick, as, submenu, ...rest } = item;
    return (
      <Interactive
        key={id}
        as={as}
        className={cn(
          sub ? NAV_SUBITEM_BASE : NAV_ITEM_BASE,
          navCollapsed ? 'justify-center px-0' : sub && 'ps-9',
          active && NAV_ITEM_ACTIVE,
        )}
        onClick={onClick}
        active={active}
        label={label}
        rest={rest}
      >
        {Icon ? (
          <span className="relative inline-flex shrink-0">
            <Icon size={17} className="shrink-0" />
            {alert ? <AlertDot /> : null}
          </span>
        ) : null}
        <span
          className={cn(
            NAV_LABEL_BASE,
            labelTransitionClass,
            navCollapsed ? NAV_LABEL_COLLAPSED : NAV_LABEL_EXPANDED,
          )}
          aria-hidden="true"
        >
          {label}
        </span>
      </Interactive>
    );
  }

  return (
    <nav
      className={cn(
        'dash-glass dash-glass-rail relative flex shrink-0 flex-col box-border',
        'rounded-2xl select-none',
        transitionClass,
        navCollapsed ? 'w-16 px-2 py-2.5' : 'w-56 px-2.5 py-2.5',
        className,
      )}
      aria-label={ariaLabel}
      aria-busy={transitionMs > 0 ? transitioning : undefined}
    >
      <div
        className={cn(
          'flex-none flex items-center justify-start gap-2 pb-1',
          'transition-opacity duration-150',
          openGroupId && 'opacity-35',
        )}
      >
        <button
          type="button"
          className={cn(NAV_ICON_BTN, 'w-8 h-8')}
          onClick={toggleNavCollapsed}
          aria-label={navCollapsed ? expandLabel : collapseLabel}
          title={navCollapsed ? expandLabel : collapseLabel}
        >
          {navCollapsed ? (
            <RailExpandIcon size={16} aria-hidden="true" />
          ) : (
            <RailCollapseIcon size={16} aria-hidden="true" />
          )}
        </button>
        {brand ? (
          <div
            className={cn(NAV_LABEL_BASE, labelTransitionClass)}
            style={navCollapsed ? { maxWidth: 0, opacity: 0 } : { maxWidth: 160, opacity: 1 }}
            aria-hidden={navCollapsed || undefined}
          >
            {brand}
          </div>
        ) : null}
      </div>

      {/* At most one group is ever open (see expandedGroups above) -- while
          it is, every OTHER row (sibling groups and flat items alike) goes
          invisible so full attention goes to the open submenu, and the
          still-visible chrome above/below (the collapse toggle, the footer)
          dims for the same reason. Deliberately `invisible`, not unmounted
          or display:none: those hidden rows still occupy their layout
          space, so the open group never shifts position -- unmounting them
          would make the opened group slide up to fill the gap, which reads
          as the rail jumping on every click. Closing the group (its own
          header is still rendered and still clickable) brings everything
          back. */}
      <div
        className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden"
        inert={(transitionMs > 0 && transitioning) || undefined}
      >
        {items.map((item) => {
          const groupOpen = hasSubmenu(item) && Boolean(expandedGroups[item.id]);
          const dimmed = openGroupId && item.id !== openGroupId;

          if (!hasSubmenu(item)) {
            return (
              <div
                key={item.id}
                className={cn('transition-opacity duration-150', dimmed && 'invisible')}
              >
                {renderRow(item, false)}
              </div>
            );
          }

          const submenu = item.submenu ?? [];
          const groupActive = submenu.some((s) => s.active);
          // A closed group hides its submenu entirely, so an alert inside
          // one would otherwise be invisible until the operator happens to
          // open the group -- surface it on the group's own icon too.
          const groupAlert = Boolean(item.alert) || submenu.some((s) => s.alert);
          // Closing: drop to {} (nothing open). Opening: replace the whole
          // state with just this group, so whatever else was open closes.
          const toggle = () =>
            setExpandedGroups((s) => (s[item.id] ? {} : { [item.id]: true }));
          const toggleLabel =
            groupExpandLabel?.(item, groupOpen) ??
            (groupOpen ? `Collapse ${item.label}` : `Expand ${item.label}`);
          const GroupIcon = item.icon;

          return (
            <div
              key={item.id}
              className={cn('flex flex-col gap-0.5 transition-opacity duration-150', dimmed && 'invisible')}
            >
              <div className="relative">
                <button
                  type="button"
                  className={cn(
                    NAV_ITEM_BASE,
                    navCollapsed ? 'justify-center px-0' : 'pe-9',
                    groupActive && NAV_ITEM_ACTIVE,
                  )}
                  onClick={toggle}
                  aria-expanded={groupOpen}
                  aria-label={item.label}
                  title={item.label}
                >
                  {GroupIcon ? (
                    <span className="relative inline-flex shrink-0">
                      <GroupIcon size={17} className="shrink-0" />
                      {groupAlert ? <AlertDot /> : null}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      NAV_LABEL_BASE,
                      labelTransitionClass,
                      navCollapsed ? NAV_LABEL_COLLAPSED : NAV_LABEL_EXPANDED,
                    )}
                    aria-hidden="true"
                  >
                    {item.label}
                  </span>
                </button>
                {navCollapsed ? null : (
                  <button
                    type="button"
                    className={cn(
                      NAV_ICON_BTN,
                      'absolute end-1.5 top-1/2 h-7 w-7 -translate-y-1/2',
                      groupActive && 'text-primary',
                    )}
                    onClick={toggle}
                    aria-expanded={groupOpen}
                    aria-label={toggleLabel}
                    title={toggleLabel}
                  >
                    <ChevronDown
                      size={15}
                      className={cn('transition-transform duration-150', groupOpen && 'rotate-180')}
                    />
                  </button>
                )}
              </div>
              {groupOpen ? (
                <div
                  className={cn(
                    'flex flex-col gap-0.5 rounded-xl p-1',
                    'bg-[var(--nav-nest-fill)]',
                    'shadow-[inset_0_1px_2px_var(--nav-nest-shadow)]',
                  )}
                >
                  {submenu.map((sub) => renderRow(sub, true))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {footer ? (
        <div
          className={cn(
            'flex-none flex items-center pt-2 mt-1',
            'border-t border-[color-mix(in_srgb,var(--border)_55%,transparent)]',
            'transition-opacity duration-150',
            openGroupId && 'opacity-35',
            // A second footer action needs room to sit apart from the first
            // (a row with a spacer when expanded, stacked when there's no
            // width to spare) -- a single action just centers/leans start.
            footer.secondary
              ? navCollapsed
                ? 'flex-col justify-center gap-1.5'
                : 'gap-2 ps-1'
              : navCollapsed
                ? 'justify-center'
                : 'ps-1',
          )}
          inert={(transitionMs > 0 && transitioning) || undefined}
        >
          {/* 'group' + 'relative' here, not on the button: the sliding tooltip
              is positioned off the button's own box (so it never affects rail
              layout/width) but still needs to react to hovering the button. */}
          <div className="group relative inline-flex items-center">
            <Interactive
              as={footer.as}
              className={cn(
                'flex items-center m-0 p-0 border-0 bg-transparent cursor-pointer',
                'rounded-full hover:opacity-90 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'focus-visible:ring-offset-[var(--bg)]',
              )}
              onClick={footer.onClick}
              active={footer.active}
              label={footer.tooltip}
              rest={Object.fromEntries(
                Object.entries(footer).filter(
                  ([k]) => !['icon', 'tooltip', 'active', 'onClick', 'as', 'secondary'].includes(k),
                ),
              )}
            >
              {footer.icon}
            </Interactive>
            <span
              className={cn(
                'pointer-events-none absolute top-1/2 z-10 -translate-y-1/2',
                'whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[13px] font-medium',
                'border-[color-mix(in_srgb,var(--rim)_45%,transparent)] bg-[var(--panel2)] text-foreground shadow-lg',
                'opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:opacity-100',
                isRtl
                  ? 'right-full translate-x-1.5 group-hover:translate-x-0'
                  : 'left-full -translate-x-1.5 group-hover:translate-x-0',
              )}
              style={{ [isRtl ? 'marginRight' : 'marginLeft']: '8px' }}
              aria-hidden="true"
            >
              {footer.tooltip}
            </span>
          </div>
          {footer.secondary ? (
            <>
              {navCollapsed ? null : <div className="min-w-0 flex-1" />}
              <Interactive
                as={footer.secondary.as}
                className={cn(NAV_ICON_BTN, 'w-8 h-8')}
                onClick={footer.secondary.onClick}
                label={footer.secondary.tooltip}
                rest={Object.fromEntries(
                  Object.entries(footer.secondary).filter(
                    ([k]) => !['icon', 'tooltip', 'onClick', 'as'].includes(k),
                  ),
                )}
              >
                {footer.secondary.icon}
              </Interactive>
            </>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
