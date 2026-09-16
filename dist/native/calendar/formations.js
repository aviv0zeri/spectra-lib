// The three calendar "formations" as one polymorphic object rather than a
// pile of `if (calendarType === ...)` cases scattered through a screen. A
// CalendarSystem knows everything formation-specific: how to enumerate a
// window of month pages, how a day and a month header read, and how a
// rollover or a year-jump maps onto its own month sequence. CalendarGrid
// drives one without knowing which it holds.
//
//   - gregorian: the civil month, days as plain numbers.
//   - hebrew:    one Hebrew month per page (day א..end). Days read in Hebrew
//                reckoning -- gematria letters under an RTL UI, plain numbers
//                under an LTR one ("no Hebrew letters at all in an LTR
//                calendar"). Header/marker likewise: Hebrew script + gematria
//                year for RTL, transliteration + numeric year for LTR.
//   - mixed:     the civil month laid out, with BOTH reckonings per day --
//                the big number is Gregorian, the small one the Hebrew day
//                (letters RTL / number LTR). Header stays Gregorian.
import { addHebrewMonths, gregorianToHebrew, hebrewDayLetters, hebrewMonthKey, hebrewMonthName, hebrewMonthOrdinal, hebrewYearLetters, } from './hebrewDate';
import { dateFromLocalDayOrdinal, getHebrewMonthGrid, getMonthGrid, localDayOrdinal, } from './grid';
/** Decode a Gregorian anchor key "y-m0" (m0 0-based). */
function decodeGreg(anchorKey) {
    const [y, m] = anchorKey.split('-').map(Number);
    return { year: y, month: m };
}
/** Decode a Hebrew anchor key "hy-hm". */
function decodeHeb(anchorKey) {
    const [y, m] = anchorKey.split('-').map(Number);
    return { year: y, month: m };
}
function createGregorianLike(opts, mixed) {
    const { layoutRTL, monthLabelStyle = 'name', t } = opts;
    return {
        type: mixed ? 'mixed' : 'gregorian',
        anchorKey(todayOrd) {
            const d = dateFromLocalDayOrdinal(todayOrd);
            return `${d.getFullYear()}-${d.getMonth()}`;
        },
        todayPageKey(todayOrd) {
            return this.anchorKey(todayOrd);
        },
        buildPages(anchorKey, back, aheadCount, weekStartsOn) {
            const { year, month } = decodeGreg(anchorKey);
            const list = [];
            for (let i = -back; i < aheadCount; i++) {
                const flat = month + i;
                const y = year + Math.floor(flat / 12);
                const m = ((flat % 12) + 12) % 12;
                list.push({ key: `${y}-${m}`, ...getMonthGrid(y, m, weekStartsOn) });
            }
            return list;
        },
        flatIndexForGregorian(anchorKey, year, month0) {
            const a = decodeGreg(anchorKey);
            return (year - a.year) * 12 + (month0 - a.month);
        },
        dayLabels(_page, dayNum, date) {
            if (!mixed)
                return { big: String(dayNum), sub: null };
            const hebDay = gregorianToHebrew(date).day;
            return { big: String(dayNum), sub: layoutRTL ? hebrewDayLetters(hebDay) : String(hebDay) };
        },
        gregorianDayNum(_page, dayNum) {
            return dayNum;
        },
        monthMarker(page) {
            return t(`cal_month_short_${page.month + 1}`);
        },
        title(page) {
            if (monthLabelStyle === 'number')
                return `${page.month + 1}/${page.year}`;
            return `${t(`cal_month_${page.month + 1}`)} ${page.year}`;
        },
    };
}
function createHebrew(opts) {
    const { layoutRTL, t } = opts;
    return {
        type: 'hebrew',
        anchorKey(todayOrd) {
            const h = gregorianToHebrew(dateFromLocalDayOrdinal(todayOrd));
            return `${h.year}-${h.month}`;
        },
        todayPageKey(todayOrd) {
            const h = gregorianToHebrew(dateFromLocalDayOrdinal(todayOrd));
            return `h${h.year}-${h.month}`;
        },
        buildPages(anchorKey, back, aheadCount, weekStartsOn) {
            const { year, month } = decodeHeb(anchorKey);
            const list = [];
            for (let i = -back; i < aheadCount; i++) {
                const step = addHebrewMonths(year, month, i);
                list.push({
                    key: `h${step.year}-${step.month}`,
                    ...getHebrewMonthGrid(step.year, step.month, weekStartsOn),
                });
            }
            return list;
        },
        flatIndexForGregorian(anchorKey, year, month0) {
            const a = decodeHeb(anchorKey);
            const target = gregorianToHebrew(new Date(year, month0, 1));
            return hebrewMonthOrdinal(target.year, target.month) - hebrewMonthOrdinal(a.year, a.month);
        },
        dayLabels(_page, dayNum) {
            return { big: layoutRTL ? hebrewDayLetters(dayNum) : String(dayNum), sub: null };
        },
        gregorianDayNum(_page, _dayNum, date) {
            return date.getDate();
        },
        monthMarker(page) {
            const hm = page.hebMonth;
            const hy = page.hebYear;
            return layoutRTL ? hebrewMonthName(hm, hy) : t(hebrewMonthKey(hm, hy));
        },
        title(page) {
            const hm = page.hebMonth;
            const hy = page.hebYear;
            if (layoutRTL)
                return `${hebrewMonthName(hm, hy)} ${hebrewYearLetters(hy)}`;
            return `${t(hebrewMonthKey(hm, hy))} ${hy}`;
        },
    };
}
/**
 * Build the CalendarSystem for a formation. The rollover drop-height needs
 * the window's `back` count, which lives on the grid, so it is computed here
 * as a standalone helper (droppedWeeksOnRollover on the object returns null;
 * CalendarGrid calls computeDroppedWeeks instead).
 */
export function createCalendarSystem(opts) {
    if (opts.type === 'hebrew')
        return createHebrew(opts);
    return createGregorianLike(opts, opts.type === 'mixed');
}
/**
 * Weeks in the month that drops off the FRONT of the window when today rolls
 * from `prevTodayOrd` to `newTodayOrd`, or null if no page-unit boundary was
 * crossed. Standalone (not a method) because it needs the window's `back`.
 */
export function computeDroppedWeeks(system, prevTodayOrd, newTodayOrd, back, weekStartsOn) {
    if (system.type === 'hebrew') {
        const was = gregorianToHebrew(dateFromLocalDayOrdinal(prevTodayOrd));
        const now = gregorianToHebrew(dateFromLocalDayOrdinal(newTodayOrd));
        if (was.year === now.year && was.month === now.month)
            return null;
        const oldest = addHebrewMonths(was.year, was.month, -back);
        return getHebrewMonthGrid(oldest.year, oldest.month, weekStartsOn).weeksCount;
    }
    const prev = dateFromLocalDayOrdinal(prevTodayOrd);
    const now = dateFromLocalDayOrdinal(newTodayOrd);
    if (prev.getFullYear() === now.getFullYear() && prev.getMonth() === now.getMonth())
        return null;
    const oldestFlat = prev.getMonth() - back;
    return getMonthGrid(prev.getFullYear() + Math.floor(oldestFlat / 12), ((oldestFlat % 12) + 12) % 12, weekStartsOn).weeksCount;
}
export { localDayOrdinal, dateFromLocalDayOrdinal };
