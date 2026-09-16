import { dateFromLocalDayOrdinal, localDayOrdinal, type MonthGrid } from './grid';
export type CalendarType = 'gregorian' | 'hebrew' | 'mixed';
/** One page of the calendar list: a Gregorian month, or a Hebrew one. */
export interface MonthPage extends MonthGrid {
    key: string;
    hebYear?: number;
    hebMonth?: number;
    isHebrewMonth?: boolean;
}
/** The two date slots a day cell can show. `sub` is null unless the formation fills it. */
export interface DayLabels {
    big: string;
    sub: string | null;
}
export interface CalendarSystem {
    readonly type: CalendarType;
    /** Memo key for today's anchor month -- stable while today stays in the same page-unit month. */
    anchorKey(todayOrd: number): string;
    /** `back` pages before the anchor month then `aheadCount` from the anchor on (index `back` is the anchor). */
    buildPages(anchorKey: string, back: number, aheadCount: number, weekStartsOn: 0 | 1): MonthPage[];
    /** The page key of the month today sits in (index `back` of buildPages). */
    todayPageKey(todayOrd: number): string;
    /** Flat page index (0 = anchor) for a Gregorian (year, month0) -- the year-view jump. */
    flatIndexForGregorian(anchorKey: string, year: number, month0: number): number;
    /** big/sub labels for a cell -- `date` is its Gregorian date, `dayNum` the page's own day-of-month. */
    dayLabels(page: MonthPage, dayNum: number, date: Date): DayLabels;
    /** The Gregorian day-of-month the cell keys/speaks by (booking dates + a11y are always Gregorian). */
    gregorianDayNum(page: MonthPage, dayNum: number, date: Date): number;
    /** The small day-1 month marker, in the page's own reckoning. */
    monthMarker(page: MonthPage): string;
    /** The header title for a page. */
    title(page: MonthPage): string;
}
export interface CalendarSystemOptions {
    type: CalendarType;
    layoutRTL: boolean;
    monthLabelStyle?: 'name' | 'number';
    /** Resolves i18n keys: 'cal_month_1'.. 'cal_month_short_1'.. and 'hebrew_month_7'.. */
    t: (key: string) => string;
}
/**
 * Build the CalendarSystem for a formation. The rollover drop-height needs
 * the window's `back` count, which lives on the grid, so it is computed here
 * as a standalone helper (droppedWeeksOnRollover on the object returns null;
 * CalendarGrid calls computeDroppedWeeks instead).
 */
export declare function createCalendarSystem(opts: CalendarSystemOptions): CalendarSystem;
/**
 * Weeks in the month that drops off the FRONT of the window when today rolls
 * from `prevTodayOrd` to `newTodayOrd`, or null if no page-unit boundary was
 * crossed. Standalone (not a method) because it needs the window's `back`.
 */
export declare function computeDroppedWeeks(system: CalendarSystem, prevTodayOrd: number, newTodayOrd: number, back: number, weekStartsOn: 0 | 1): number | null;
export { localDayOrdinal, dateFromLocalDayOrdinal };
