import type { ForwardedRef, ReactNode } from 'react';
import { Animated } from 'react-native';
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
    /**
     * The screen behind the calendar (a consumer's own void/page colour).
     * Painted on a trailing filler cell (the blank days after the month
     * ends) so it reads as the page showing through, not a stray patch of
     * the week card's own `panel` colour -- optional, defaults to
     * 'transparent' (the week card's panel shows through, the old look).
     */
    background?: string;
    /**
     * A faint fill laid down the 1st-of-month cell, the same shape as
     * `weekendTint` -- optional, defaults to no fill (the day-1 number's
     * own drop shadow is the only month-start cue, the old look).
     */
    monthMarkerTint?: string;
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
    /**
     * Jump to a page by its own key (a MonthPage's `key`, from onVisibleMonthChange,
     * onMonthLayout, or the system's buildPages). The right call when the
     * caller holds a page: for the Hebrew formation a page's Gregorian
     * year/month names the month its FIRST day falls in, which
     * scrollToGregorianMonth resolves to the page before it. A key beyond the
     * loaded window loads it first.
     */
    scrollToPage: (key: string) => void;
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
    /**
     * Bump this whenever a slot's OUTPUT would change for the same day (new
     * bookings, a tap flash, a holiday toggle) -- the list only re-renders its
     * rows when this (or the month window) changes, exactly like the FlatList
     * `extraData` it feeds. A value with stable identity between real changes.
     */
    extraData?: unknown;
    dayBackgroundColor?: DayStyleFn;
    /**
     * A full-cell fill beyond dayBackgroundColor's flat color -- an SVG
     * LinearGradient, say. Absolutely filled to the cell, rendered UNDER the
     * day number / below-text / corner / badge and ON TOP of
     * dayBackgroundColor's own flat fill (so a consumer can layer the two, or
     * use this alone and leave dayBackgroundColor's return undefined).
     * pointerEvents="none": never intercepts the day's own tap. Give whatever
     * you return `style={StyleSheet.absoluteFill}` (not percentage width/
     * height props) to fill the cell -- react-native-svg's own percentage-
     * prop sizing is inconsistent across platforms, while a style-based fill
     * against the wrapping View (itself sized reliably by Yoga) always works.
     */
    renderDayBackground?: DayNodeFn;
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
    /**
     * The day ordinal of the topmost visible week row, reported on every scroll
     * tick it changes -- lets a consumer feel its own content go by (a haptic
     * as a booking's first night crosses the top of the view, say) at DAY
     * granularity, finer than onVisibleMonthChange's month.
     */
    onTopOrdinalChange?: (ord: number) => void;
    /**
     * Snap every flick to a month start, stopping at the very next month like
     * a paged list. Off by default: the list scrolls freely with normal
     * momentum, the way a calendar app's month list does -- paging made a
     * long scroll feel slow, one month per flick.
     */
    snapToMonths?: boolean;
    /**
     * The list's content offset (y), driven on the UI thread straight from the
     * native scroll event -- hand in an Animated.Value to move something in
     * step with the scroll with no JS work per tick (a scrubber's "you are
     * here" knob, say). Seeded with the opening offset.
     */
    scrollY?: Animated.Value;
    /**
     * Every loaded month's block offset + height in the list's content, in
     * month order, whenever the layout changes -- the other half of `scrollY`:
     * lets a consumer map an offset to a month and a fraction through it.
     */
    onMonthLayout?: (blocks: {
        key: string;
        offset: number;
        height: number;
    }[]) => void;
    /**
     * Extra inset on the reading-END edge (right in LTR, left in RTL) of the
     * weekday header and every week row: a gutter for something the consumer
     * overlays on that edge (a scrubber rail) so it never covers a day.
     */
    endInset?: number;
    /**
     * Drawn over the list viewport (absolutely positioned children span it
     * exactly: top 0 = the first visible row's edge, bottom 0 = the last),
     * above the rows and below the footer -- a scrubber rail, say. Touches on
     * it are its own; pass pointerEvents="box-none" on its wrapper to let the
     * rest through to the rows.
     */
    listOverlay?: ReactNode;
    /** Small accessory beside the month title (a "future month has a booking" dot, say). */
    renderTitleAccessory?: (page: MonthPage) => ReactNode;
    /** Tapping the title / its chevron -- the consumer opens its own month picker. */
    onTitlePress?: () => void;
    footer?: ReactNode;
    gridRef?: ForwardedRef<CalendarGridHandle>;
    testID?: string;
}
export declare function CalendarGrid({ calendarType, layoutRTL, weekStartsOn, monthLabelStyle, t, colors, fontFamily, rowHeight, monthsBack, initialMonths, extendMonths, maxMonthsAhead, initialScrollTo, weekdayLabels, todayLabel, extraData, dayBackgroundColor, renderDayBackground, dayRingStyle, isDayDisabled, isDayMuted, renderDayBelow, renderDayCorner, renderDayBadge, renderWeekOverlay, onDayPress, onVisibleMonthChange, onTopOrdinalChange, snapToMonths, scrollY, onMonthLayout, endInset, listOverlay, renderTitleAccessory, onTitlePress, footer, gridRef, testID, }: CalendarGridProps): import("react").JSX.Element;
export {};
