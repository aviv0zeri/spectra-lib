export declare const DAY_MS: number;
/**
 * A whole-day ordinal for `date` (its own local calendar day) -- built from
 * `Date.UTC` on the Y/M/D fields, so a DST transition can never shift it:
 * two calls one calendar day apart always differ by exactly 1.
 */
export declare function localDayOrdinal(date: Date): number;
/** The inverse of localDayOrdinal: the local-midnight Date of that day. */
export declare function dateFromLocalDayOrdinal(ord: number): Date;
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
export declare function getMonthGrid(year: number, month: number, weekStartsOn: 0 | 1): MonthGrid;
/**
 * One HEBREW month's grid geometry, in the exact same shape getMonthGrid
 * returns -- the block runs day א to the month's last day, placed in the
 * weekday column its first day falls in (columns stay Sun..Sat). `year`/
 * `month` carry the GREGORIAN year/month of day א; `isHebrewMonth` tells the
 * two kinds of grid apart.
 * @param hebMonth 1..13, Nisan-based
 */
export declare function getHebrewMonthGrid(hebYear: number, hebMonth: number, weekStartsOn: 0 | 1): HebrewMonthGrid;
