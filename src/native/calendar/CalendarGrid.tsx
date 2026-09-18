// CalendarGrid -- a continuous, month-snapped, vertically scrolling calendar
// that renders any of the three formations (gregorian / hebrew / mixed) from
// one code path, driven by a CalendarSystem adapter. It owns everything that
// is the same for every app: the scrolling month window, snap + rollover, the
// week-card visual, the weekday header + month title, and the breathing
// "today" mark. Everything an app puts ON a day -- holiday tints and labels,
// booking bars, badges, which days are tappable -- is a slot the consumer
// fills, exactly the way StatusScreen keeps icons and surfaces out of this
// package. No domain logic, no icon library, no default palette.
//
// The layout machinery (offset table, getItemLayout, the snap offsets, the
// midnight-rollover scroll compensation, the grow-on-end-reached window) is
// ported from GateOpen's BookingsCalendarScreen so the feel is identical; the
// booking-specific parts that used to be tangled into it are now the slots.

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ForwardedRef, ReactNode } from 'react';
import {
  Animated,
  AppState,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import {
  computeDroppedWeeks,
  createCalendarSystem,
  dateFromLocalDayOrdinal,
  localDayOrdinal,
  type CalendarSystem,
  type CalendarType,
  type MonthPage,
} from './formations';

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
  initialScrollTo?: 'today' | { gregorian: { year: number; month0: number } } | { pageKey: string };
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
  onMonthLayout?: (blocks: { key: string; offset: number; height: number }[]) => void;
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

// Fixed marks -- semantic constants, not theme palette, so they keep their
// meaning across every consumer's colours (same red the app's other "today"
// rings use). A consumer that truly needs to override them can layer its own
// mark via renderDayBadge; these stay constant on purpose.
const TODAY_CIRCLE = '#e5484d';
const TODAY_ON_FILL = '#ffffff';
const TODAY_CIRCLE_SIZE = 22;

const DAY_NUM_TOP = 4;
const DAY_NUM_LINE_H = 18;
const SUB_LABEL_LINE_H = 13;

// Breathing room above each month's first week, the gap between week cards,
// and the gap after a month block. Part of every offset, so getItemLayout and
// the rendered heights can never silently drift.
const MARKER_GAP = 10;
const WEEK_GAP = 6;
const MONTH_GAP = 18;
const LIST_TOP_PAD = 14;
const MONTH_FLIP_FRACTION = 0.4;

/** Saturday, whichever column it lands in for the current weekStartsOn. */
const SATURDAY = 6;

function monthBlockHeight(weeksCount: number, rowHeight: number): number {
  return MARKER_GAP + weeksCount * rowHeight + (weeksCount - 1) * WEEK_GAP + MONTH_GAP;
}

/**
 * One month's weeks. A memo-friendly pure render helper -- everything it needs
 * comes in as arguments so it recomputes only when the page or a slot changes.
 */
function MonthBlock({
  page,
  system,
  rowHeight,
  weekStartsOn,
  layoutRTL,
  todayOrd,
  colors,
  fontFamily,
  slots,
}: {
  page: MonthPage;
  system: CalendarSystem;
  rowHeight: number;
  weekStartsOn: 0 | 1;
  layoutRTL: boolean;
  todayOrd: number;
  colors: CalendarColors;
  fontFamily?: string;
  slots: {
    dayBackgroundColor?: DayStyleFn;
    renderDayBackground?: DayNodeFn;
    dayRingStyle?: DayRingFn;
    isDayDisabled?: DayBoolFn;
    isDayMuted?: DayBoolFn;
    renderDayBelow?: DayNodeFn;
    renderDayCorner?: DayNodeFn;
    renderDayBadge?: DayNodeFn;
    renderWeekOverlay?: (page: MonthPage, weekIndex: number, rowHeight: number) => ReactNode;
    onDayPress?: (day: CalendarDay) => void;
  };
}) {
  const weekday = (col: number) => (weekStartsOn + col) % 7;
  return (
    <View style={{ height: monthBlockHeight(page.weeksCount, rowHeight) }}>
      <View style={{ marginTop: MARKER_GAP }}>
        {Array.from({ length: page.weeksCount }, (_, weekIdx) => (
          <View
            key={weekIdx}
            style={{
              height: rowHeight,
              marginBottom: weekIdx === page.weeksCount - 1 ? 0 : WEEK_GAP,
            }}
          >
            {/* The week is one rounded card; its overflow clips the end cells'
                fills to the rounded corners, and the day cells inside are
                divided by hairlines rather than gaps -- so neighbouring-month
                greys sit flush with no white seam between them. */}
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                direction: layoutRTL ? 'rtl' : 'ltr',
                backgroundColor: colors.panel,
                borderRadius: 14,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.rim,
                overflow: 'hidden',
              }}
            >
              {Array.from({ length: 7 }, (_, col) => {
                const flatIdx = weekIdx * 7 + col;
                const dayNum = flatIdx - page.firstColOffset + 1;
                const isSaturday = weekday(col) === SATURDAY;
                // A hairline border is a PHYSICAL left/right edge -- it does
                // NOT mirror with `direction`, only the row's child ORDER
                // does. Under RTL the array is rendered right-to-left, so
                // the array's own first/last index no longer sit at the
                // row's visual left edge: col 0 lands at the visual RIGHT
                // now, col 6 at the visual LEFT. Excluding col 0 (as LTR
                // correctly does, to leave the row's own left edge bare)
                // left the wrong pair undivided under RTL -- the boundary
                // between the array's col 0 and col 1, which after the
                // mirror are the row's rightmost two cells -- while col 6
                // (now the true leftmost, needing no divider) kept one it
                // no longer touches anything to the left of. Excluding
                // whichever index sits at the ACTUAL leftmost visual
                // position fixes both ends for either direction.
                const leftmostCol = layoutRTL ? 6 : 0;
                const divider =
                  col !== leftmostCol
                    ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.rim }
                    : null;
                if (dayNum < 1 || dayNum > page.daysInMonth) {
                  // A LEADING filler (before day 1) wears the faint grey wash
                  // that marks "not this month"; a TRAILING filler (after the
                  // last day) is erased -- blank, no wash, no divider -- so the
                  // month ends clean instead of on a grey block. Contiguous
                  // leading fillers still merge into one band (no inter-cell
                  // gaps in the card).
                  const trailing = dayNum > page.daysInMonth;
                  return (
                    <View
                      key={col}
                      style={[
                        { flex: 1 },
                        trailing
                          ? { backgroundColor: colors.background ?? 'transparent' }
                          : { backgroundColor: `${colors.rim}55` },
                        trailing ? null : (divider as ViewStyle),
                      ]}
                    />
                  );
                }
                const ord = page.firstOfMonthOrd + (dayNum - 1);
                const date =
                  page.isHebrewMonth === true
                    ? dateFromLocalDayOrdinal(ord)
                    : new Date(page.year, page.month, dayNum);
                const labels = system.dayLabels(page, dayNum, date);
                const day: CalendarDay = {
                  ordinal: ord,
                  date,
                  gregorianDayNum: system.gregorianDayNum(page, dayNum, date),
                  pageDayNum: dayNum,
                  bigLabel: labels.big,
                  subLabel: labels.sub,
                  monthMarker: dayNum === 1 ? system.monthMarker(page) : null,
                  isToday: ord === todayOrd,
                  isPast: ord < todayOrd,
                  inMonth: true,
                  weekIndex: weekIdx,
                  colIndex: col,
                  page,
                };
                const bg = slots.dayBackgroundColor?.(day);
                const background = slots.renderDayBackground?.(day);
                const ring = slots.dayRingStyle?.(day);
                const disabled = slots.isDayDisabled?.(day) ?? false;
                const muted = slots.isDayMuted?.(day) ?? false;
                // The consumer's below-the-number content (a holiday label,
                // say) WINS the one small subtitle slot: the cell has room for
                // one line, not two, so when it returns something the
                // formation's own sub-label / month marker steps aside.
                const below = slots.renderDayBelow?.(day);
                return (
                  <Pressable
                    key={col}
                    disabled={disabled}
                    onPress={slots.onDayPress ? () => slots.onDayPress?.(day) : undefined}
                    accessibilityLabel={[
                      day.bigLabel,
                      day.bigLabel === String(day.gregorianDayNum) ? null : String(day.gregorianDayNum),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    style={({ pressed }) => [
                      { flex: 1 },
                      pressed ? { opacity: 0.85 } : null,
                    ]}
                  >
                    <View
                      style={[
                        { flex: 1 },
                        // renderDayBackground paints as an absolutely-filled
                        // CHILD (below), not this View's own backgroundColor
                        // -- unlike `bg`, which RN clips to this View's own
                        // border-radius automatically, an absolute child is
                        // NOT clipped to an ancestor's radius unless the
                        // ancestor sets overflow:'hidden'. dayRingStyle can
                        // in principle carry a borderRadius (it's a plain
                        // ViewStyle), so this is here to keep a rounded ring
                        // + a full-cell gradient consistent with each other
                        // rather than the gradient squaring off past the
                        // ring's corners. A no-op for every ring style that
                        // has no radius (the only kind in use today).
                        { overflow: 'hidden' },
                        isSaturday ? { backgroundColor: colors.weekendTint } : null,
                        bg ? { backgroundColor: bg } : null,
                        divider as ViewStyle,
                        ring as ViewStyle,
                      ]}
                    >
                      {background != null ? (
                        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                          {background}
                        </View>
                      ) : null}
                      <View
                        style={{
                          marginTop: DAY_NUM_TOP,
                          height: DAY_NUM_LINE_H,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {day.isToday ? <TodayDisc /> : null}
                        <Text
                          style={{
                            textAlign: 'center',
                            fontSize: 15,
                            lineHeight: DAY_NUM_LINE_H,
                            // Uniform weight -- today is marked by the disc, not
                            // a heavier number (on request 2026-09-16).
                            fontWeight: '600',
                            fontFamily,
                            color: day.isToday ? TODAY_ON_FILL : muted ? colors.muted : colors.text,
                            fontVariant: ['tabular-nums'],
                            // A day-1 number gets a soft drop shadow -- the
                            // marker (month name/number) already sitting
                            // below it makes this cell the one that starts
                            // a new month, and the lift makes the number
                            // itself read as the one that's "raised" for
                            // it (on request). Every other day stays flat.
                            ...(day.monthMarker != null
                              ? {
                                  textShadowColor: 'rgba(0,0,0,0.35)',
                                  textShadowOffset: { width: 0, height: 1 },
                                  textShadowRadius: 2,
                                }
                              : null),
                          }}
                        >
                          {day.bigLabel}
                        </Text>
                      </View>
                      {below != null ? (
                        below
                      ) : day.subLabel != null || day.monthMarker != null ? (
                        <Text
                          numberOfLines={1}
                          style={{
                            textAlign: 'center',
                            marginTop: 1,
                            fontSize: 10,
                            lineHeight: SUB_LABEL_LINE_H,
                            color: colors.muted,
                            fontFamily,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {day.subLabel ?? day.monthMarker}
                        </Text>
                      ) : null}
                      {slots.renderDayCorner ? (
                        <View
                          pointerEvents="none"
                          style={[
                            { position: 'absolute', top: 3 },
                            layoutRTL ? { right: 3 } : { left: 3 },
                          ]}
                        >
                          {slots.renderDayCorner(day)}
                        </View>
                      ) : null}
                      {slots.renderDayBadge ? (
                        <View
                          pointerEvents="none"
                          style={[
                            { position: 'absolute', top: 2 },
                            layoutRTL ? { left: 2 } : { right: 2 },
                          ]}
                        >
                          {slots.renderDayBadge(day)}
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {slots.renderWeekOverlay ? (
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                {slots.renderWeekOverlay(page, weekIdx, rowHeight)}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** The "today" disc, breathing -- a slow scale+opacity pulse behind the number. */
function TodayDisc() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.62] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        alignSelf: 'center',
        top: (DAY_NUM_LINE_H - TODAY_CIRCLE_SIZE) / 2,
        width: TODAY_CIRCLE_SIZE,
        height: TODAY_CIRCLE_SIZE,
        borderRadius: TODAY_CIRCLE_SIZE / 2,
        backgroundColor: TODAY_CIRCLE,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

export function CalendarGrid({
  calendarType,
  layoutRTL,
  weekStartsOn,
  monthLabelStyle = 'name',
  t,
  colors,
  fontFamily,
  rowHeight,
  monthsBack = 12,
  initialMonths = 12,
  extendMonths = 12,
  maxMonthsAhead = 24,
  initialScrollTo = 'today',
  weekdayLabels,
  todayLabel,
  extraData,
  dayBackgroundColor,
  renderDayBackground,
  dayRingStyle,
  isDayDisabled,
  isDayMuted,
  renderDayBelow,
  renderDayCorner,
  renderDayBadge,
  renderWeekOverlay,
  onDayPress,
  onVisibleMonthChange,
  onTopOrdinalChange,
  snapToMonths = false,
  scrollY,
  onMonthLayout,
  endInset = 0,
  listOverlay,
  renderTitleAccessory,
  onTitlePress,
  footer,
  gridRef,
  testID,
}: CalendarGridProps) {
  const system = useMemo(
    () => createCalendarSystem({ type: calendarType, layoutRTL, monthLabelStyle, t }),
    [calendarType, layoutRTL, monthLabelStyle, t],
  );

  const [anchorOrd, setAnchorOrd] = useState(() => localDayOrdinal(new Date()));
  const anchorOrdRef = useRef(anchorOrd);
  anchorOrdRef.current = anchorOrd;
  const [monthCount, setMonthCount] = useState(initialMonths);

  const anchorKey = useMemo(() => system.anchorKey(anchorOrd), [system, anchorOrd]);
  const months = useMemo(
    () => system.buildPages(anchorKey, monthsBack, monthCount, weekStartsOn),
    [system, anchorKey, monthsBack, monthCount, weekStartsOn],
  );

  const layoutTable = useMemo(() => {
    let offset = LIST_TOP_PAD;
    const out: { offset: number; height: number }[] = [];
    for (const m of months) {
      const height = monthBlockHeight(m.weeksCount, rowHeight);
      out.push({ offset, height });
      offset += height;
    }
    return out;
  }, [months, rowHeight]);
  const snapOffsets = useMemo(
    () => (snapToMonths ? layoutTable.map((l) => l.offset) : undefined),
    [layoutTable, snapToMonths],
  );
  useEffect(() => {
    if (!onMonthLayout) return;
    onMonthLayout(
      months.map((m, i) => ({
        key: m.key,
        offset: layoutTable[i].offset,
        height: layoutTable[i].height,
      })),
    );
  }, [months, layoutTable, onMonthLayout]);

  const listRef = useRef<FlatList<MonthPage> | null>(null);
  const listHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const pendingDropHeightRef = useRef<number | null>(null);
  const pendingScrollFlatRef = useRef<number | null>(null);

  const [visibleKey, setVisibleKey] = useState(() => system.todayPageKey(anchorOrd));

  // The month index the list should OPEN at (initialScrollTo), resolved once
  // against the freshly-built window.
  const initialIndex = useMemo(() => {
    if (initialScrollTo === 'today') return monthsBack;
    if ('pageKey' in initialScrollTo) {
      const i = months.findIndex((m) => m.key === initialScrollTo.pageKey);
      return i >= 0 ? i : monthsBack;
    }
    const flat = system.flatIndexForGregorian(
      anchorKey,
      initialScrollTo.gregorian.year,
      initialScrollTo.gregorian.month0,
    );
    return Math.max(0, Math.min(months.length - 1, flat + monthsBack));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolved once for the opening frame
  }, []);

  const syncVisibleMonth = useCallback(
    (offset: number) => {
      const probe = offset + listHeightRef.current * MONTH_FLIP_FRACTION;
      let idx = 0;
      for (let i = 0; i < layoutTable.length; i++) {
        if (layoutTable[i].offset > probe) break;
        idx = i;
      }
      const key = months[idx]?.key;
      if (!key) return;
      setVisibleKey((prev) => (prev === key ? prev : key));
    },
    [layoutTable, months],
  );

  const [showTodayPill, setShowTodayPill] = useState(false);
  const awayRef = useRef(false);
  const topOrdRef = useRef<number | null>(null);

  // The day ordinal of the first day in the topmost visible week row: find
  // the month block under the top edge, then the week row inside it. A
  // leading filler row clamps to the month's own first day.
  const topOrdinalAt = useCallback(
    (y: number): number | null => {
      let idx = 0;
      for (let i = 0; i < layoutTable.length; i++) {
        if (layoutTable[i].offset > y) break;
        idx = i;
      }
      const page = months[idx];
      const block = layoutTable[idx];
      if (!page || !block) return null;
      const inner = y - block.offset - MARKER_GAP;
      const weekIdx = Math.max(
        0,
        Math.min(page.weeksCount - 1, Math.floor(inner / (rowHeight + WEEK_GAP))),
      );
      return Math.max(page.firstOfMonthOrd, page.firstOfMonthOrd + weekIdx * 7 - page.firstColOffset);
    },
    [layoutTable, months, rowHeight],
  );

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollOffsetRef.current = y;
      syncVisibleMonth(y);
      const home = layoutTable[monthsBack];
      const shouldShow = home ? Math.abs(y - home.offset) > home.height * 0.6 : false;
      awayRef.current = shouldShow;
      setShowTodayPill((prev) => (prev === shouldShow ? prev : shouldShow));
      if (onTopOrdinalChange) {
        const ord = topOrdinalAt(y);
        if (ord != null && ord !== topOrdRef.current) {
          topOrdRef.current = ord;
          onTopOrdinalChange(ord);
        }
      }
    },
    [layoutTable, monthsBack, syncVisibleMonth, onTopOrdinalChange, topOrdinalAt],
  );
  // With a consumer's scrollY: the native event feeds it on the UI thread and
  // the JS handler above rides along as its listener.
  const scrollHandler = useMemo(
    () =>
      scrollY
        ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
            listener: onScroll,
          })
        : onScroll,
    [scrollY, onScroll],
  );

  // Rollover: re-check "today" on foreground + on an interval, sliding the
  // window and compensating the scroll for whatever month dropped off the
  // front so the view doesn't jump.
  const checkRollover = useCallback(() => {
    const newOrd = localDayOrdinal(new Date());
    const prevOrd = anchorOrdRef.current;
    if (newOrd === prevOrd) return;
    const droppedWeeks = computeDroppedWeeks(system, prevOrd, newOrd, monthsBack, weekStartsOn);
    if (droppedWeeks != null) pendingDropHeightRef.current = monthBlockHeight(droppedWeeks, rowHeight);
    setAnchorOrd(newOrd);
  }, [system, monthsBack, weekStartsOn, rowHeight]);

  useEffect(() => {
    const id = setInterval(checkRollover, 20000);
    return () => clearInterval(id);
  }, [checkRollover]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkRollover();
    });
    return () => sub.remove();
  }, [checkRollover]);

  useEffect(() => {
    scrollOffsetRef.current = layoutTable[initialIndex]?.offset || 0;
    scrollY?.setValue(scrollOffsetRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  // Compensate the offset for a dropped-off-front month after a rollover.
  useEffect(() => {
    const dropped = pendingDropHeightRef.current;
    if (dropped == null) return;
    pendingDropHeightRef.current = null;
    const next = Math.max(0, scrollOffsetRef.current - dropped);
    scrollOffsetRef.current = next;
    syncVisibleMonth(next);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: next, animated: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a dropped month, not syncVisibleMonth identity
  }, [anchorOrd]);

  // A month picked beyond the loaded window waits for the monthCount bump.
  useEffect(() => {
    const pendingFlat = pendingScrollFlatRef.current;
    if (pendingFlat == null) return;
    const arrayIndex = pendingFlat + monthsBack;
    if (arrayIndex >= months.length) return;
    pendingScrollFlatRef.current = null;
    const target = layoutTable[arrayIndex];
    if (!target) return;
    scrollOffsetRef.current = target.offset;
    syncVisibleMonth(target.offset);
    requestAnimationFrame(() =>
      listRef.current?.scrollToOffset({ offset: target.offset, animated: false }),
    );
  }, [months, layoutTable, monthsBack, syncVisibleMonth]);

  const scrollToFlat = useCallback(
    (flat: number, animated: boolean) => {
      const arrayIndex = flat + monthsBack;
      if (arrayIndex >= months.length) {
        pendingScrollFlatRef.current = flat;
        setMonthCount((n) => Math.min(maxMonthsAhead, Math.max(n, flat + 1)));
        return;
      }
      const target = layoutTable[arrayIndex];
      if (!target) return;
      // A newer in-window pick supersedes a queued out-of-window one --
      // otherwise the extension's effect yanks the list to that far month.
      pendingScrollFlatRef.current = null;
      scrollOffsetRef.current = target.offset;
      syncVisibleMonth(target.offset);
      // The target is already laid out (its offset came from the live table),
      // so jump now: a deferred frame only adds latency to a scrub that wants
      // to feel glued to the finger.
      listRef.current?.scrollToOffset({ offset: target.offset, animated });
    },
    [layoutTable, maxMonthsAhead, months.length, monthsBack, syncVisibleMonth],
  );

  useImperativeHandle(
    gridRef,
    () => ({
      scrollToToday: (animated = true) => {
        const home = layoutTable[monthsBack];
        if (home) {
          requestAnimationFrame(() =>
            listRef.current?.scrollToOffset({ offset: home.offset, animated }),
          );
        }
      },
      scrollToGregorianMonth: (year: number, month0: number) => {
        scrollToFlat(system.flatIndexForGregorian(anchorKey, year, month0), false);
      },
      scrollToPage: (key: string) => {
        const loaded = months.findIndex((m) => m.key === key);
        if (loaded >= 0) {
          scrollToFlat(loaded - monthsBack, false);
          return;
        }
        // Beyond the loaded window: locate it in the full reachable span.
        const all = system.buildPages(anchorKey, monthsBack, maxMonthsAhead, weekStartsOn);
        const i = all.findIndex((m) => m.key === key);
        if (i >= 0) scrollToFlat(i - monthsBack, false);
      },
    }),
    [layoutTable, monthsBack, scrollToFlat, system, anchorKey, months, maxMonthsAhead, weekStartsOn],
  );

  const getItemLayout = useCallback(
    (_d: unknown, index: number) => ({
      length: layoutTable[index]?.height || 0,
      offset: layoutTable[index]?.offset || 0,
      index,
    }),
    [layoutTable],
  );

  const visiblePage = useMemo(
    () => months.find((m) => m.key === visibleKey) || months[monthsBack] || months[0],
    [months, visibleKey, monthsBack],
  );
  useEffect(() => {
    if (visiblePage) onVisibleMonthChange?.(visiblePage);
  }, [visiblePage, onVisibleMonthChange]);

  // The slots are fresh closures every render; a stable renderItem reads the
  // latest set through this ref so it never captures a stale one, and the
  // FlatList re-renders its rows off `listExtra` (the month window + the
  // consumer's extraData) rather than off the slot identities.
  const slotsRef = useRef<Parameters<typeof MonthBlock>[0]['slots']>({});
  slotsRef.current = {
    dayBackgroundColor,
    renderDayBackground,
    dayRingStyle,
    isDayDisabled,
    isDayMuted,
    renderDayBelow,
    renderDayCorner,
    renderDayBadge,
    renderWeekOverlay,
    onDayPress,
  };
  const listExtra = useMemo(() => ({ anchorOrd, extraData }), [anchorOrd, extraData]);
  const renderItem = useCallback(
    ({ item }: { item: MonthPage }) => (
      <MonthBlock
        page={item}
        system={system}
        rowHeight={rowHeight}
        weekStartsOn={weekStartsOn}
        layoutRTL={layoutRTL}
        todayOrd={anchorOrd}
        colors={colors}
        fontFamily={fontFamily}
        slots={slotsRef.current}
      />
    ),
    [system, rowHeight, weekStartsOn, layoutRTL, anchorOrd, colors, fontFamily],
  );

  const weekdayOrder = Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);

  return (
    <View style={{ flex: 1 }} testID={testID}>
      <Pressable
        onPress={onTitlePress}
        disabled={!onTitlePress}
        accessibilityRole={onTitlePress ? 'button' : undefined}
        style={{
          paddingHorizontal: 16,
          marginTop: 8,
          flexDirection: layoutRTL ? 'row-reverse' : 'row',
          direction: 'ltr',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: colors.title,
            fontSize: 22,
            fontWeight: '800',
            fontFamily,
            textAlign: layoutRTL ? 'right' : 'left',
            writingDirection: layoutRTL ? 'rtl' : 'ltr',
          }}
        >
          {visiblePage ? system.title(visiblePage) : ''}
        </Text>
        {onTitlePress ? <Chevron color={colors.muted} /> : null}
        {visiblePage ? renderTitleAccessory?.(visiblePage) : null}
      </Pressable>

      <View
        style={{
          // The same inset as the week cards below, so the seven header
          // columns sit exactly over the seven day columns.
          paddingLeft: 8 + (layoutRTL ? endInset : 0),
          paddingRight: 8 + (layoutRTL ? 0 : endInset),
          marginTop: 10,
          marginBottom: 4,
        }}
      >
        <View style={{ flexDirection: 'row', direction: layoutRTL ? 'rtl' : 'ltr' }}>
          {weekdayOrder.map((wd) => (
            <View key={wd} style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: '700',
                  fontFamily,
                  textAlign: 'center',
                }}
              >
                {weekdayLabels[wd]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
      <Animated.FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={months}
        keyExtractor={(m) => m.key}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        snapToOffsets={snapOffsets}
        disableIntervalMomentum={snapToMonths}
        decelerationRate={snapToMonths ? 'fast' : 'normal'}
        onLayout={(e) => {
          listHeightRef.current = e.nativeEvent.layout.height;
        }}
        onEndReached={() => setMonthCount((n) => Math.min(maxMonthsAhead, n + extendMonths))}
        onEndReachedThreshold={2}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        extraData={listExtra}
        contentContainerStyle={{
          paddingTop: LIST_TOP_PAD,
          paddingLeft: 8 + (layoutRTL ? endInset : 0),
          paddingRight: 8 + (layoutRTL ? 0 : endInset),
          paddingBottom: 90,
        }}
        showsVerticalScrollIndicator={false}
      />
      {/* Keeps the consumer's scrollY attached for the grid's lifetime. An
          Animated value whose last child detaches drops its native node,
          while the list's native scroll event stays bound to the dropped one
          -- so a consumer that mounts and unmounts what rides scrollY would
          otherwise find it frozen. Zero-size, touch-transparent. */}
      {scrollY ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', width: 0, height: 0, transform: [{ translateY: scrollY }] }}
        />
      ) : null}
      {listOverlay}
      </View>

      {footer}

      {showTodayPill && todayLabel ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: footer ? 52 : 18,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => {
              const home = layoutTable[monthsBack];
              if (home)
                listRef.current?.scrollToOffset({ offset: home.offset, animated: true });
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              {
                paddingVertical: 9,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: colors.panel,
                borderWidth: 1,
                borderColor: colors.rim,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              },
              pressed ? { transform: [{ scale: 0.96 }], opacity: 0.85 } : null,
            ]}
          >
            <Text
              style={{ color: colors.text, fontSize: 13, fontWeight: '700', fontFamily }}
            >
              {todayLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** A down chevron drawn with two strokes -- no icon dependency (this package ships none). */
function Chevron({ color }: { color: string }) {
  const bar: TextStyle | ViewStyle = {
    position: 'absolute',
    width: 8,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: color,
  };
  return (
    <View style={{ width: 14, height: 10, justifyContent: 'center' }}>
      <View style={[bar, { left: 1, transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { right: 1, transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}
