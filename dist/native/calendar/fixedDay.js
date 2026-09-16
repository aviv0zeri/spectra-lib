// Fixed-day (R.D.) arithmetic -- the shared base every calendar system in
// this module converts to and from Gregorian through, so the Hebrew (and any
// future Islamic/Christian) reckoning all speak one arithmetic instead of
// hand-copies drifting apart. R.D. 1 = Monday, 1 January 1 CE (proleptic
// Gregorian); a fixed day mod 7 is its weekday with 0 = Sunday.
//
// Source: Dershowitz & Reingold, "Calendrical Calculations". Ported verbatim
// from GateOpen's src/lib/fixedDay.js so the two produce bit-identical
// results (GateOpen now re-exports these from here instead of keeping a copy).
/** Floor division that behaves for negative numerators (JS `%` does not). */
export function floorDiv(a, b) {
    return Math.floor(a / b);
}
/** Non-negative remainder. */
export function mod(a, b) {
    return a - b * Math.floor(a / b);
}
export function gregorianLeapYear(year) {
    return (mod(year, 4) === 0 && mod(year, 400) !== 100 && mod(year, 400) !== 200 && mod(year, 400) !== 300);
}
/** Fixed day of a proleptic Gregorian date (month is 1-based). */
export function fixedFromGregorian(year, month, day) {
    const y = year - 1;
    let fixed = 365 * y +
        floorDiv(y, 4) -
        floorDiv(y, 100) +
        floorDiv(y, 400) +
        floorDiv(367 * month - 362, 12);
    if (month > 2)
        fixed -= gregorianLeapYear(year) ? 1 : 2;
    return fixed + day;
}
/** Proleptic Gregorian year of a fixed day. */
export function gregorianYearFromFixed(fixed) {
    const d0 = fixed - 1;
    const n400 = floorDiv(d0, 146097);
    const d1 = mod(d0, 146097);
    const n100 = floorDiv(d1, 36524);
    const d2 = mod(d1, 36524);
    const n4 = floorDiv(d2, 1461);
    const d3 = mod(d2, 1461);
    const n1 = floorDiv(d3, 365);
    const year = 400 * n400 + 100 * n100 + 4 * n4 + n1;
    return n100 === 4 || n1 === 4 ? year : year + 1;
}
/** Proleptic Gregorian date of a fixed day (month is 1-based). */
export function gregorianFromFixed(fixed) {
    const year = gregorianYearFromFixed(fixed);
    const priorDays = fixed - fixedFromGregorian(year, 1, 1);
    const correction = fixed < fixedFromGregorian(year, 3, 1) ? 0 : gregorianLeapYear(year) ? 1 : 2;
    const month = floorDiv(12 * (priorDays + correction) + 373, 367);
    const day = fixed - fixedFromGregorian(year, month, 1) + 1;
    return { year, month, day };
}
