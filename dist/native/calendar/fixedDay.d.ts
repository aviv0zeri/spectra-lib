/** Floor division that behaves for negative numerators (JS `%` does not). */
export declare function floorDiv(a: number, b: number): number;
/** Non-negative remainder. */
export declare function mod(a: number, b: number): number;
export declare function gregorianLeapYear(year: number): boolean;
/** Fixed day of a proleptic Gregorian date (month is 1-based). */
export declare function fixedFromGregorian(year: number, month: number, day: number): number;
/** Proleptic Gregorian year of a fixed day. */
export declare function gregorianYearFromFixed(fixed: number): number;
/** Proleptic Gregorian date of a fixed day (month is 1-based). */
export declare function gregorianFromFixed(fixed: number): {
    year: number;
    month: number;
    day: number;
};
