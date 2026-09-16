// Hebrew calendar arithmetic (Dershowitz & Reingold, "Calendrical
// Calculations", ch. 8): molad of Tishrei, the four dehiyyot, variable
// Cheshvan/Kislev, Adar I/II, plus the gematria formatting a Hebrew calendar
// actually prints its days and years in.
//
// Ported verbatim from GateOpen's src/lib/israelHolidays.js (the pure
// calendar half only -- the Israeli observance rules stay in GateOpen). The
// two are bit-identical; GateOpen re-exports these from here so there is one
// implementation, not a copy per project.
import { floorDiv, mod, fixedFromGregorian, gregorianFromFixed } from './fixedDay';
/** Fixed day of 1 Tishrei AM 1 (Monday, 7 October 3761 BCE Julian). */
const HEBREW_EPOCH = -1373427;
const NISAN = 1;
const IYAR = 2;
const ELUL = 6;
const TISHREI = 7;
const CHESHVAN = 8;
const KISLEV = 9;
export const ADAR = 12;
const ADAR_II = 13;
/**
 * Leap years sit at positions 3, 6, 8, 11, 14, 17 and 19 of the 19-year
 * cycle; `(7y + 1) mod 19 < 7` is the closed form of that pattern.
 */
export function hebrewLeapYear(year) {
    return mod(7 * year + 1, 19) < 7;
}
export function lastMonthOfHebrewYear(year) {
    return hebrewLeapYear(year) ? ADAR_II : ADAR;
}
/**
 * Days from the epoch to the molad-derived Rosh Hashana of `year`, before the
 * year-length corrections (molad, molad zaken, lo ADU Rosh).
 */
function hebrewCalendarElapsedDays(year) {
    const monthsElapsed = floorDiv(235 * year - 234, 19);
    const partsElapsed = 12084 + 13753 * monthsElapsed;
    const day = 29 * monthsElapsed + floorDiv(partsElapsed, 25920);
    return mod(3 * (day + 1), 7) < 3 ? day + 1 : day;
}
/** The remaining two dehiyyot, as a correction on the new year (GaTaRaD / BeTU'TeKaPoT). */
function hebrewYearLengthCorrection(year) {
    const ny0 = hebrewCalendarElapsedDays(year - 1);
    const ny1 = hebrewCalendarElapsedDays(year);
    const ny2 = hebrewCalendarElapsedDays(year + 1);
    if (ny2 - ny1 === 356)
        return 2;
    if (ny1 - ny0 === 382)
        return 1;
    return 0;
}
/** Fixed day of 1 Tishrei. */
function hebrewNewYear(year) {
    return HEBREW_EPOCH + hebrewCalendarElapsedDays(year) + hebrewYearLengthCorrection(year);
}
/** 353, 354 or 355 days (383, 384 or 385 in a leap year). */
function daysInHebrewYear(year) {
    return hebrewNewYear(year + 1) - hebrewNewYear(year);
}
/**
 * Length of a Hebrew month. Cheshvan and Kislev flex with the year length;
 * Adar has 29 days except as Adar I of a leap year, where it has 30.
 * @param month 1..13, Nisan-based
 */
export function lastDayOfHebrewMonth(year, month) {
    if (month === IYAR || month === 4 || month === ELUL || month === 10 || month === ADAR_II)
        return 29;
    if (month === ADAR && !hebrewLeapYear(year))
        return 29;
    const length = daysInHebrewYear(year);
    if (month === CHESHVAN && length !== 355 && length !== 385)
        return 29;
    if (month === KISLEV && (length === 353 || length === 383))
        return 29;
    return 30;
}
/**
 * Every month of a Hebrew year in CALENDAR order -- Tishrei through the
 * year's last month, then Nisan through Elul. Month NUMBERS are Nisan-based,
 * so numbering and reading order are deliberately different sequences.
 * @returns 12 months, 13 in a leap year
 */
export function hebrewMonthsInOrder(year) {
    const out = [];
    const last = lastMonthOfHebrewYear(year);
    for (let m = TISHREI; m <= last; m++)
        out.push(m);
    for (let m = NISAN; m <= ELUL; m++)
        out.push(m);
    return out;
}
/**
 * A Hebrew month's index on one unbroken month count, so two months can be
 * compared or subtracted across year and leap-year boundaries.
 * @param month 1..13, Nisan-based
 */
export function hebrewMonthOrdinal(year, month) {
    return floorDiv(235 * year - 234, 19) + hebrewMonthsInOrder(year).indexOf(month);
}
/**
 * `delta` Hebrew months away from (year, month), stepping in calendar order.
 * @param month 1..13, Nisan-based
 */
export function addHebrewMonths(year, month, delta) {
    let y = year;
    let idx = hebrewMonthsInOrder(y).indexOf(month) + delta;
    while (idx < 0) {
        y -= 1;
        idx += hebrewMonthsInOrder(y).length;
    }
    let len = hebrewMonthsInOrder(y).length;
    while (idx >= len) {
        idx -= len;
        y += 1;
        len = hebrewMonthsInOrder(y).length;
    }
    return { year: y, month: hebrewMonthsInOrder(y)[idx] };
}
/** Fixed day of a Hebrew date. @param month 1..13, Nisan-based */
export function fixedFromHebrew(year, month, day) {
    let fixed = hebrewNewYear(year) + day - 1;
    if (month < TISHREI) {
        const last = lastMonthOfHebrewYear(year);
        for (let m = TISHREI; m <= last; m++)
            fixed += lastDayOfHebrewMonth(year, m);
        for (let m = NISAN; m < month; m++)
            fixed += lastDayOfHebrewMonth(year, m);
    }
    else {
        for (let m = TISHREI; m < month; m++)
            fixed += lastDayOfHebrewMonth(year, m);
    }
    return fixed;
}
/** Hebrew date of a fixed day. */
export function hebrewFromFixed(fixed) {
    const approx = floorDiv((fixed - HEBREW_EPOCH) * 98496, 35975351) + 1;
    let year = approx - 1;
    while (hebrewNewYear(year + 1) <= fixed)
        year++;
    const start = fixed < fixedFromHebrew(year, NISAN, 1) ? TISHREI : NISAN;
    let month = start;
    while (fixed > fixedFromHebrew(year, month, lastDayOfHebrewMonth(year, month)))
        month++;
    const day = fixed - fixedFromHebrew(year, month, 1) + 1;
    return { year, month, day };
}
/** Hebrew date of a JS Date (read in local time, matching the calendar grid). */
export function gregorianToHebrew(date) {
    return hebrewFromFixed(fixedFromGregorian(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}
/** Local-midnight JS Date of a Hebrew date. @param month 1..13, Nisan-based */
export function hebrewToGregorian(year, month, day) {
    const g = gregorianFromFixed(fixedFromHebrew(year, month, day));
    return new Date(g.year, g.month - 1, g.day);
}
const HEBREW_MONTH_NAMES = {
    1: 'ניסן',
    2: 'אייר',
    3: 'סיוון',
    4: 'תמוז',
    5: 'אב',
    6: 'אלול',
    7: 'תשרי',
    8: 'חשוון',
    9: 'כסלו',
    10: 'טבת',
    11: 'שבט',
    13: 'אדר ב׳',
};
/**
 * A Hebrew month's own name, in Hebrew letters -- for a Hebrew (RTL) UI.
 * Month 12 is "אדר" in a plain year but "אדר א׳" once a leap year's 13th
 * month exists alongside it.
 * @param month 1..13, Nisan-based
 */
export function hebrewMonthName(month, year) {
    if (month === ADAR)
        return hebrewLeapYear(year) ? 'אדר א׳' : 'אדר';
    return HEBREW_MONTH_NAMES[month];
}
/**
 * i18n key for a Hebrew month name, for every UI language OTHER than Hebrew
 * (a consumer resolves it through its own translation table) -- same
 * Adar/Adar-I year dependency as hebrewMonthName.
 */
export function hebrewMonthKey(month, year) {
    if (month === ADAR && hebrewLeapYear(year))
        return 'hebrew_month_12_leap';
    return `hebrew_month_${month}`;
}
const HEBREW_LETTERS_HUNDREDS = {
    100: 'ק',
    200: 'ר',
    300: 'ש',
    400: 'ת',
    500: 'תק',
    600: 'תר',
    700: 'תש',
    800: 'תת',
    900: 'תתק',
};
const HEBREW_LETTERS_TENS = {
    10: 'י',
    20: 'כ',
    30: 'ל',
    40: 'מ',
    50: 'נ',
    60: 'ס',
    70: 'ע',
    80: 'פ',
    90: 'צ',
};
const HEBREW_LETTERS_ONES = {
    1: 'א',
    2: 'ב',
    3: 'ג',
    4: 'ד',
    5: 'ה',
    6: 'ו',
    7: 'ז',
    8: 'ח',
    9: 'ט',
};
/**
 * A Hebrew year in gematria letters (e.g. 5786 -> "תשפ״ו"). The millennium
 * digit is conventionally dropped, and 15/16 are spelled ט"ו/ט"ז.
 */
export function hebrewYearLetters(year) {
    const n = year % 1000;
    const hundreds = Math.floor(n / 100) * 100;
    const rest = n % 100;
    let tail;
    if (rest === 15)
        tail = 'טו';
    else if (rest === 16)
        tail = 'טז';
    else {
        const tens = Math.floor(rest / 10) * 10;
        const ones = rest % 10;
        tail = (HEBREW_LETTERS_TENS[tens] || '') + (HEBREW_LETTERS_ONES[ones] || '');
    }
    const letters = (HEBREW_LETTERS_HUNDREDS[hundreds] || '') + tail;
    return letters.length > 1 ? `${letters.slice(0, -1)}״${letters.slice(-1)}` : `${letters}׳`;
}
/**
 * A Hebrew day-of-month in gematria letters (1 -> "א׳", 15 -> "ט״ו",
 * 30 -> "ל׳"). 15/16 spelled ט״ו/ט״ז; a single letter takes a trailing
 * geresh (׳), two or more a gershayim (״) before the last letter.
 * @param day 1..30
 */
export function hebrewDayLetters(day) {
    let letters;
    if (day === 15)
        letters = 'טו';
    else if (day === 16)
        letters = 'טז';
    else {
        const tens = Math.floor(day / 10) * 10;
        const ones = day % 10;
        letters = (HEBREW_LETTERS_TENS[tens] || '') + (HEBREW_LETTERS_ONES[ones] || '');
    }
    return letters.length > 1 ? `${letters.slice(0, -1)}״${letters.slice(-1)}` : `${letters}׳`;
}
