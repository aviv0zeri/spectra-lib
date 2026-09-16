// Month-grid geometry -- turns a (Gregorian or Hebrew) month into the
// ordinals, column offset and week count a weekly grid lays out from. Kept
// deliberately reckoning-agnostic in shape: getHebrewMonthGrid returns the
// EXACT same fields getMonthGrid does (plus the Hebrew ones), so a layout
// engine can render either without knowing which calendar cut the month.
//
// Ported verbatim from GateOpen's src/lib/guestRows.js (getMonthGrid /
// getHebrewMonthGrid / localDayOrdinal / dateFromLocalDayOrdinal); GateOpen
// re-exports these from here.

import { hebrewToGregorian, lastDayOfHebrewMonth } from './hebrewDate';

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A whole-day ordinal for `date` (its own local calendar day) -- built from
 * `Date.UTC` on the Y/M/D fields, so a DST transition can never shift it:
 * two calls one calendar day apart always differ by exactly 1.
 */
export function localDayOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** The inverse of localDayOrdinal: the local-midnight Date of that day. */
export function dateFromLocalDayOrdinal(ord: number): Date {
  const u = new Date(ord * DAY_MS);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}

export interface MonthGrid {
  year: number;
  month: number;
  firstOfMonthOrd: number;
  daysInMonth: number;
  firstColOffset: number;
  weeksCount: number;
}

export interface HebrewMonthGrid extends MonthGrid {
  hebYear: number;
  hebMonth: number;
  isHebrewMonth: true;
}

/** One Gregorian month's grid geometry. @param month 0-based */
export function getMonthGrid(year: number, month: number, weekStartsOn: 0 | 1): MonthGrid {
  const firstOfMonthOrd = localDayOrdinal(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstJsDay = new Date(year, month, 1).getDay();
  const firstColOffset = (firstJsDay - weekStartsOn + 7) % 7;
  const weeksCount = Math.ceil((firstColOffset + daysInMonth) / 7);
  return { year, month, firstOfMonthOrd, daysInMonth, firstColOffset, weeksCount };
}

/**
 * One HEBREW month's grid geometry, in the exact same shape getMonthGrid
 * returns -- the block runs day א to the month's last day, placed in the
 * weekday column its first day falls in (columns stay Sun..Sat). `year`/
 * `month` carry the GREGORIAN year/month of day א; `isHebrewMonth` tells the
 * two kinds of grid apart.
 * @param hebMonth 1..13, Nisan-based
 */
export function getHebrewMonthGrid(
  hebYear: number,
  hebMonth: number,
  weekStartsOn: 0 | 1,
): HebrewMonthGrid {
  const firstDate = hebrewToGregorian(hebYear, hebMonth, 1);
  const firstOfMonthOrd = localDayOrdinal(firstDate);
  const daysInMonth = lastDayOfHebrewMonth(hebYear, hebMonth);
  const firstColOffset = (firstDate.getDay() - weekStartsOn + 7) % 7;
  const weeksCount = Math.ceil((firstColOffset + daysInMonth) / 7);
  return {
    year: firstDate.getFullYear(),
    month: firstDate.getMonth(),
    hebYear,
    hebMonth,
    isHebrewMonth: true,
    firstOfMonthOrd,
    daysInMonth,
    firstColOffset,
    weeksCount,
  };
}
