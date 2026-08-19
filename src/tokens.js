/**
 * GateOpen's semantic color tokens — the values that are meant to be
 * identical everywhere they appear, not each app's own design choice.
 *
 * What's deliberately NOT here:
 * - Surface/neutral colors (background, panel, void, ...). Dashboard uses a
 *   3-tier surface system (bg/panel/panel2); MobileApp uses a 5-tier one
 *   (void/base/shellBar/modal/panel). Those aren't the same shape with
 *   different values, they're structurally different systems — unifying
 *   them is a real redesign, not a token extraction, so each app keeps its
 *   own.
 * - Dashboard's accent color. MobileApp and Website already agree with each
 *   other (#8b9dc3 dark / #3d5580 light, both below); Dashboard's is a
 *   third, unexplained value with no documented reason to differ OR to
 *   match — a genuine open question, not a bug like the status colors were,
 *   so it's left alone pending an actual decision.
 * - Border radius. Dashboard's tighter, Website's rounder — reads as the
 *   same kind of deliberate register difference as their Button shapes
 *   (admin tool vs marketing site), not measured drift.
 *
 * Source of truth is MobileApp's src/lib/themePalettes.js, the most
 * complete of the three -- these are its `accent`/`chipActiveFill`/
 * `primaryBtnLabel`/`ok`/`okBright`/`warn`/`bad` fields (blue accent
 * variant only; the other 4 accent choices are a MobileApp-only picker
 * feature, not part of the shared surface).
 */

export const DARK = {
  accent: '#8b9dc3',
  chipActiveFill: '#2b3247',
  primaryBtnLabel: '#0c0c0e',
  // ok/warn retuned 2026-08-19 (product feedback: the saturated originals
  // read as stock template colors, not GateOpen's). See MobileApp's
  // themePalettes.js for the full history -- this package always tracks
  // its CURRENT values, not a copy frozen at some past date.
  ok: '#69b492',
  okBright: '#8fd0ac',
  warn: '#d4a648',
  bad: '#c2685f',
};

export const LIGHT = {
  accent: '#3d5580',
  chipActiveFill: '#e4eaf5',
  primaryBtnLabel: '#ffffff',
  ok: '#3c7a5e',
  okBright: '#5aa17d',
  warn: '#a17a2c',
  bad: '#b64d4d',
};
