import type { ForwardedRef, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { type CalendarType, type MonthPage } from './formations';
/** The caller's theme, read verbatim -- same no-defaults convention as StatusColors. */
export interface CalendarColors {
    text: string;
    muted: string;
    /** The week-card surface. */
    panel: string;
    /** Hairline dividers between day cells and the faint neighbouring-month fill. */
    rim: string;
    /** A slightly stronger separator, used for the weekday-header underline. */
    edge: string;
    /** The month title + the header alert accessory colour when the consumer draws one. */
    title: string;
    /** A faint tint laid down the weekend (Saturday) column. */
    weekendTint: string;
}
export interface CalendarDay {
    /** The whole-day ordinal (DST-safe) -- the stable key for booking math. */
    ordinal: number;
    /** The cell's Gregorian date (local midnight). */
    date: Date;
    /** Gregorian day-of-month -- what a11y speaks and bookings key by, every formation. */
    gregorianDayNum: number;
    /** The page's own day-of-month (a Hebrew day on a Hebrew page). */
    pageDayNum: number;
    /** The primary label the cell prints (already formatted for the formation + UI direction). */
    bigLabel: string;
    /** The secondary label (mixed mode's Hebrew day), or null. */
    subLabel: string | null;
    /** On the 1st of the page's month, the short month name; else null. */
    monthMarker: string | null;
    isToday: boolean;
    isPast: boolean;
    /** false only for the neighbouring-month filler cells (never passed to slots). */
    inMonth: boolean;
    weekIndex: number;
    /** 0..6 within the week, in reading order. */
    colIndex: number;
    page: MonthPage;
}
type DayStyleFn = (day: CalendarDay) => string | undefined;
type DayRingFn = (day: CalendarDay) => StyleProp<ViewStyle> | null | undefined;
type DayBoolFn = (day: CalendarDay) => boolean;
type DayNodeFn = (day: CalendarDay) => ReactNode;
export interface CalendarGridHandle {
    scrollToToday: (animated?: boolean) => void;
    scrollToGregorianMonth: (year: number, month0: number) => void;
}
export interface CalendarGridProps {
    calendarType: CalendarType;
    layoutRTL: boolean;
    weekStartsOn: 0 | 1;
    monthLabelStyle?: 'name' | 'number';
    /** Resolves i18n keys: cal_month_*, cal_month_short_*, hebrew_month_*, and the weekday + today labels below. */
    t: (key: string) => string;
    colors: CalendarColors;
    /** Applied to the day numbers and the month title (a calendar-suitable face, e.g. Rubik). */
    fontFamily?: string;
    /** Height of one week row, consumer-computed (day number area + its own label/bar budget). */
    rowHeight: number;
    monthsBack?: number;
    initialMonths?: number;
    extendMonths?: number;
    maxMonthsAhead?: number;
    /** Where the list opens. Defaults to today; a consumer passes a specific month to override (e.g. a just-made booking). */
    initialScrollTo?: 'today' | {
        gregorian: {
            year: number;
            month0: number;
        };
    } | {
        pageKey: string;
    };
    weekdayLabels: string[];
    todayLabel?: string;
    dayBackgroundColor?: DayStyleFn;
    dayRingStyle?: DayRingFn;
    isDayDisabled?: DayBoolFn;
    isDayMuted?: DayBoolFn;
    renderDayBelow?: DayNodeFn;
    /** Reading-START corner mark (top-left LTR / top-right RTL) -- a faith glyph, say. */
    renderDayCorner?: DayNodeFn;
    /** Reading-END corner mark (top-right LTR / top-left RTL) -- an overflow "+N", say. */
    renderDayBadge?: DayNodeFn;
    /** Absolute overlay across a whole week row (booking bars). Positioned by the consumer. */
    renderWeekOverlay?: (page: MonthPage, weekIndex: number, rowHeight: number) => ReactNode;
    onDayPress?: (day: CalendarDay) => void;
    onVisibleMonthChange?: (page: MonthPage) => void;
    /** Small accessory beside the month title (a "future month has a booking" dot, say). */
    renderTitleAccessory?: (page: MonthPage) => ReactNode;
    /** Tapping the title / its chevron -- the consumer opens its own month picker. */
    onTitlePress?: () => void;
    footer?: ReactNode;
    gridRef?: ForwardedRef<CalendarGridHandle>;
    testID?: string;
}
export declare function CalendarGrid({ calendarType, layoutRTL, weekStartsOn, monthLabelStyle, t, colors, fontFamily, rowHeight, monthsBack, initialMonths, extendMonths, maxMonthsAhead, initialScrollTo, weekdayLabels, todayLabel, dayBackgroundColor, dayRingStyle, isDayDisabled, isDayMuted, renderDayBelow, renderDayCorner, renderDayBadge, renderWeekOverlay, onDayPress, onVisibleMonthChange, renderTitleAccessory, onTitlePress, footer, gridRef, testID, }: CalendarGridProps): import("react").JSX.Element;
export {};
