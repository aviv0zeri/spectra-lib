/**
 * A Hebrew date. Months are numbered from Nisan: 1 Nisan, 2 Iyar, 3 Sivan,
 * 4 Tammuz, 5 Av, 6 Elul, 7 Tishrei, 8 Cheshvan, 9 Kislev, 10 Tevet,
 * 11 Shvat, 12 Adar (Adar I in a leap year), 13 Adar II (leap years only).
 */
export interface HebrewDate {
    year: number;
    month: number;
    day: number;
}
export declare const ADAR = 12;
/**
 * Leap years sit at positions 3, 6, 8, 11, 14, 17 and 19 of the 19-year
 * cycle; `(7y + 1) mod 19 < 7` is the closed form of that pattern.
 */
export declare function hebrewLeapYear(year: number): boolean;
export declare function lastMonthOfHebrewYear(year: number): number;
/**
 * Length of a Hebrew month. Cheshvan and Kislev flex with the year length;
 * Adar has 29 days except as Adar I of a leap year, where it has 30.
 * @param month 1..13, Nisan-based
 */
export declare function lastDayOfHebrewMonth(year: number, month: number): number;
/**
 * Every month of a Hebrew year in CALENDAR order -- Tishrei through the
 * year's last month, then Nisan through Elul. Month NUMBERS are Nisan-based,
 * so numbering and reading order are deliberately different sequences.
 * @returns 12 months, 13 in a leap year
 */
export declare function hebrewMonthsInOrder(year: number): number[];
/**
 * A Hebrew month's index on one unbroken month count, so two months can be
 * compared or subtracted across year and leap-year boundaries.
 * @param month 1..13, Nisan-based
 */
export declare function hebrewMonthOrdinal(year: number, month: number): number;
/**
 * `delta` Hebrew months away from (year, month), stepping in calendar order.
 * @param month 1..13, Nisan-based
 */
export declare function addHebrewMonths(year: number, month: number, delta: number): {
    year: number;
    month: number;
};
/** Fixed day of a Hebrew date. @param month 1..13, Nisan-based */
export declare function fixedFromHebrew(year: number, month: number, day: number): number;
/** Hebrew date of a fixed day. */
export declare function hebrewFromFixed(fixed: number): HebrewDate;
/** Hebrew date of a JS Date (read in local time, matching the calendar grid). */
export declare function gregorianToHebrew(date: Date): HebrewDate;
/** Local-midnight JS Date of a Hebrew date. @param month 1..13, Nisan-based */
export declare function hebrewToGregorian(year: number, month: number, day: number): Date;
/**
 * A Hebrew month's own name, in Hebrew letters -- for a Hebrew (RTL) UI.
 * Month 12 is "אדר" in a plain year but "אדר א׳" once a leap year's 13th
 * month exists alongside it.
 * @param month 1..13, Nisan-based
 */
export declare function hebrewMonthName(month: number, year: number): string;
/**
 * i18n key for a Hebrew month name, for every UI language OTHER than Hebrew
 * (a consumer resolves it through its own translation table) -- same
 * Adar/Adar-I year dependency as hebrewMonthName.
 */
export declare function hebrewMonthKey(month: number, year: number): string;
/**
 * A Hebrew year in gematria letters (e.g. 5786 -> "תשפ״ו"). The millennium
 * digit is conventionally dropped, and 15/16 are spelled ט"ו/ט"ז.
 */
export declare function hebrewYearLetters(year: number): string;
/**
 * A Hebrew day-of-month in gematria letters (1 -> "א׳", 15 -> "ט״ו",
 * 30 -> "ל׳"). 15/16 spelled ט״ו/ט״ז; a single letter takes a trailing
 * geresh (׳), two or more a gershayim (״) before the last letter.
 * @param day 1..30
 */
export declare function hebrewDayLetters(day: number): string;
