import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View, } from 'react-native';
import { computeDroppedWeeks, createCalendarSystem, dateFromLocalDayOrdinal, localDayOrdinal, } from './formations';
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
function monthBlockHeight(weeksCount, rowHeight) {
    return MARKER_GAP + weeksCount * rowHeight + (weeksCount - 1) * WEEK_GAP + MONTH_GAP;
}
/**
 * One month's weeks. A memo-friendly pure render helper -- everything it needs
 * comes in as arguments so it recomputes only when the page or a slot changes.
 */
function MonthBlock({ page, system, rowHeight, weekStartsOn, layoutRTL, todayOrd, colors, fontFamily, slots, }) {
    const weekday = (col) => (weekStartsOn + col) % 7;
    return (_jsx(View, { style: { height: monthBlockHeight(page.weeksCount, rowHeight) }, children: _jsx(View, { style: { marginTop: MARKER_GAP }, children: Array.from({ length: page.weeksCount }, (_, weekIdx) => (_jsxs(View, { style: {
                    height: rowHeight,
                    marginBottom: weekIdx === page.weeksCount - 1 ? 0 : WEEK_GAP,
                }, children: [_jsx(View, { style: {
                            flex: 1,
                            flexDirection: 'row',
                            direction: layoutRTL ? 'rtl' : 'ltr',
                            backgroundColor: colors.panel,
                            borderRadius: 14,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: colors.rim,
                            overflow: 'hidden',
                        }, children: Array.from({ length: 7 }, (_, col) => {
                            const flatIdx = weekIdx * 7 + col;
                            const dayNum = flatIdx - page.firstColOffset + 1;
                            const isSaturday = weekday(col) === SATURDAY;
                            const divider = col > 0 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.rim } : null;
                            if (dayNum < 1 || dayNum > page.daysInMonth) {
                                // A LEADING filler (before day 1) wears the faint grey wash
                                // that marks "not this month"; a TRAILING filler (after the
                                // last day) is erased -- blank, no wash, no divider -- so the
                                // month ends clean instead of on a grey block. Contiguous
                                // leading fillers still merge into one band (no inter-cell
                                // gaps in the card).
                                const trailing = dayNum > page.daysInMonth;
                                return (_jsx(View, { style: [
                                        { flex: 1 },
                                        trailing ? null : { backgroundColor: `${colors.rim}55` },
                                        trailing ? null : divider,
                                    ] }, col));
                            }
                            const ord = page.firstOfMonthOrd + (dayNum - 1);
                            const date = page.isHebrewMonth === true
                                ? dateFromLocalDayOrdinal(ord)
                                : new Date(page.year, page.month, dayNum);
                            const labels = system.dayLabels(page, dayNum, date);
                            const day = {
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
                            const ring = slots.dayRingStyle?.(day);
                            const disabled = slots.isDayDisabled?.(day) ?? false;
                            const muted = slots.isDayMuted?.(day) ?? false;
                            // The consumer's below-the-number content (a holiday label,
                            // say) WINS the one small subtitle slot: the cell has room for
                            // one line, not two, so when it returns something the
                            // formation's own sub-label / month marker steps aside.
                            const below = slots.renderDayBelow?.(day);
                            return (_jsx(Pressable, { disabled: disabled, onPress: slots.onDayPress ? () => slots.onDayPress?.(day) : undefined, accessibilityLabel: [
                                    day.bigLabel,
                                    day.bigLabel === String(day.gregorianDayNum) ? null : String(day.gregorianDayNum),
                                ]
                                    .filter(Boolean)
                                    .join(', '), style: ({ pressed }) => [
                                    { flex: 1 },
                                    pressed ? { opacity: 0.85 } : null,
                                ], children: _jsxs(View, { style: [
                                        { flex: 1 },
                                        isSaturday ? { backgroundColor: colors.weekendTint } : null,
                                        bg ? { backgroundColor: bg } : null,
                                        divider,
                                        ring,
                                    ], children: [_jsxs(View, { style: {
                                                marginTop: DAY_NUM_TOP,
                                                height: DAY_NUM_LINE_H,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }, children: [day.isToday ? _jsx(TodayDisc, {}) : null, _jsx(Text, { style: {
                                                        textAlign: 'center',
                                                        fontSize: 15,
                                                        lineHeight: DAY_NUM_LINE_H,
                                                        // Uniform weight -- today is marked by the disc, not
                                                        // a heavier number (on request 2026-09-16).
                                                        fontWeight: '600',
                                                        fontFamily,
                                                        color: day.isToday ? TODAY_ON_FILL : muted ? colors.muted : colors.text,
                                                        fontVariant: ['tabular-nums'],
                                                    }, children: day.bigLabel })] }), below != null ? (below) : day.subLabel != null || day.monthMarker != null ? (_jsx(Text, { numberOfLines: 1, style: {
                                                textAlign: 'center',
                                                marginTop: 1,
                                                fontSize: 10,
                                                lineHeight: SUB_LABEL_LINE_H,
                                                color: colors.muted,
                                                fontFamily,
                                                fontVariant: ['tabular-nums'],
                                            }, children: day.subLabel ?? day.monthMarker })) : null, slots.renderDayCorner ? (_jsx(View, { pointerEvents: "none", style: [
                                                { position: 'absolute', top: 3 },
                                                layoutRTL ? { right: 3 } : { left: 3 },
                                            ], children: slots.renderDayCorner(day) })) : null, slots.renderDayBadge ? (_jsx(View, { pointerEvents: "none", style: [
                                                { position: 'absolute', top: 2 },
                                                layoutRTL ? { left: 2 } : { right: 2 },
                                            ], children: slots.renderDayBadge(day) })) : null] }) }, col));
                        }) }), slots.renderWeekOverlay ? (_jsx(View, { pointerEvents: "box-none", style: StyleSheet.absoluteFill, children: slots.renderWeekOverlay(page, weekIdx, rowHeight) })) : null] }, weekIdx))) }) }));
}
/** The "today" disc, breathing -- a slow scale+opacity pulse behind the number. */
function TodayDisc() {
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
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
        ]));
        loop.start();
        return () => loop.stop();
    }, [pulse]);
    const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.62] });
    return (_jsx(Animated.View, { style: {
            position: 'absolute',
            alignSelf: 'center',
            top: (DAY_NUM_LINE_H - TODAY_CIRCLE_SIZE) / 2,
            width: TODAY_CIRCLE_SIZE,
            height: TODAY_CIRCLE_SIZE,
            borderRadius: TODAY_CIRCLE_SIZE / 2,
            backgroundColor: TODAY_CIRCLE,
            transform: [{ scale }],
            opacity,
        } }));
}
export function CalendarGrid({ calendarType, layoutRTL, weekStartsOn, monthLabelStyle = 'name', t, colors, fontFamily, rowHeight, monthsBack = 12, initialMonths = 12, extendMonths = 12, maxMonthsAhead = 24, initialScrollTo = 'today', weekdayLabels, todayLabel, extraData, dayBackgroundColor, dayRingStyle, isDayDisabled, isDayMuted, renderDayBelow, renderDayCorner, renderDayBadge, renderWeekOverlay, onDayPress, onVisibleMonthChange, onTopOrdinalChange, snapToMonths = false, scrollY, onMonthLayout, endInset = 0, listOverlay, renderTitleAccessory, onTitlePress, footer, gridRef, testID, }) {
    const system = useMemo(() => createCalendarSystem({ type: calendarType, layoutRTL, monthLabelStyle, t }), [calendarType, layoutRTL, monthLabelStyle, t]);
    const [anchorOrd, setAnchorOrd] = useState(() => localDayOrdinal(new Date()));
    const anchorOrdRef = useRef(anchorOrd);
    anchorOrdRef.current = anchorOrd;
    const [monthCount, setMonthCount] = useState(initialMonths);
    const anchorKey = useMemo(() => system.anchorKey(anchorOrd), [system, anchorOrd]);
    const months = useMemo(() => system.buildPages(anchorKey, monthsBack, monthCount, weekStartsOn), [system, anchorKey, monthsBack, monthCount, weekStartsOn]);
    const layoutTable = useMemo(() => {
        let offset = LIST_TOP_PAD;
        const out = [];
        for (const m of months) {
            const height = monthBlockHeight(m.weeksCount, rowHeight);
            out.push({ offset, height });
            offset += height;
        }
        return out;
    }, [months, rowHeight]);
    const snapOffsets = useMemo(() => (snapToMonths ? layoutTable.map((l) => l.offset) : undefined), [layoutTable, snapToMonths]);
    useEffect(() => {
        if (!onMonthLayout)
            return;
        onMonthLayout(months.map((m, i) => ({
            key: m.key,
            offset: layoutTable[i].offset,
            height: layoutTable[i].height,
        })));
    }, [months, layoutTable, onMonthLayout]);
    const listRef = useRef(null);
    const listHeightRef = useRef(0);
    const scrollOffsetRef = useRef(0);
    const pendingDropHeightRef = useRef(null);
    const pendingScrollFlatRef = useRef(null);
    const [visibleKey, setVisibleKey] = useState(() => system.todayPageKey(anchorOrd));
    // The month index the list should OPEN at (initialScrollTo), resolved once
    // against the freshly-built window.
    const initialIndex = useMemo(() => {
        if (initialScrollTo === 'today')
            return monthsBack;
        if ('pageKey' in initialScrollTo) {
            const i = months.findIndex((m) => m.key === initialScrollTo.pageKey);
            return i >= 0 ? i : monthsBack;
        }
        const flat = system.flatIndexForGregorian(anchorKey, initialScrollTo.gregorian.year, initialScrollTo.gregorian.month0);
        return Math.max(0, Math.min(months.length - 1, flat + monthsBack));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- resolved once for the opening frame
    }, []);
    const syncVisibleMonth = useCallback((offset) => {
        const probe = offset + listHeightRef.current * MONTH_FLIP_FRACTION;
        let idx = 0;
        for (let i = 0; i < layoutTable.length; i++) {
            if (layoutTable[i].offset > probe)
                break;
            idx = i;
        }
        const key = months[idx]?.key;
        if (!key)
            return;
        setVisibleKey((prev) => (prev === key ? prev : key));
    }, [layoutTable, months]);
    const [showTodayPill, setShowTodayPill] = useState(false);
    const awayRef = useRef(false);
    const topOrdRef = useRef(null);
    // The day ordinal of the first day in the topmost visible week row: find
    // the month block under the top edge, then the week row inside it. A
    // leading filler row clamps to the month's own first day.
    const topOrdinalAt = useCallback((y) => {
        let idx = 0;
        for (let i = 0; i < layoutTable.length; i++) {
            if (layoutTable[i].offset > y)
                break;
            idx = i;
        }
        const page = months[idx];
        const block = layoutTable[idx];
        if (!page || !block)
            return null;
        const inner = y - block.offset - MARKER_GAP;
        const weekIdx = Math.max(0, Math.min(page.weeksCount - 1, Math.floor(inner / (rowHeight + WEEK_GAP))));
        return Math.max(page.firstOfMonthOrd, page.firstOfMonthOrd + weekIdx * 7 - page.firstColOffset);
    }, [layoutTable, months, rowHeight]);
    const onScroll = useCallback((e) => {
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
    }, [layoutTable, monthsBack, syncVisibleMonth, onTopOrdinalChange, topOrdinalAt]);
    // With a consumer's scrollY: the native event feeds it on the UI thread and
    // the JS handler above rides along as its listener.
    const scrollHandler = useMemo(() => scrollY
        ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
            listener: onScroll,
        })
        : onScroll, [scrollY, onScroll]);
    // Rollover: re-check "today" on foreground + on an interval, sliding the
    // window and compensating the scroll for whatever month dropped off the
    // front so the view doesn't jump.
    const checkRollover = useCallback(() => {
        const newOrd = localDayOrdinal(new Date());
        const prevOrd = anchorOrdRef.current;
        if (newOrd === prevOrd)
            return;
        const droppedWeeks = computeDroppedWeeks(system, prevOrd, newOrd, monthsBack, weekStartsOn);
        if (droppedWeeks != null)
            pendingDropHeightRef.current = monthBlockHeight(droppedWeeks, rowHeight);
        setAnchorOrd(newOrd);
    }, [system, monthsBack, weekStartsOn, rowHeight]);
    useEffect(() => {
        const id = setInterval(checkRollover, 20000);
        return () => clearInterval(id);
    }, [checkRollover]);
    useEffect(() => {
        const sub = AppState.addEventListener('change', (s) => {
            if (s === 'active')
                checkRollover();
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
        if (dropped == null)
            return;
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
        if (pendingFlat == null)
            return;
        const arrayIndex = pendingFlat + monthsBack;
        if (arrayIndex >= months.length)
            return;
        pendingScrollFlatRef.current = null;
        const target = layoutTable[arrayIndex];
        if (!target)
            return;
        scrollOffsetRef.current = target.offset;
        syncVisibleMonth(target.offset);
        requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: target.offset, animated: false }));
    }, [months, layoutTable, monthsBack, syncVisibleMonth]);
    const scrollToFlat = useCallback((flat, animated) => {
        const arrayIndex = flat + monthsBack;
        if (arrayIndex >= months.length) {
            pendingScrollFlatRef.current = flat;
            setMonthCount((n) => Math.min(maxMonthsAhead, Math.max(n, flat + 1)));
            return;
        }
        const target = layoutTable[arrayIndex];
        if (!target)
            return;
        // A newer in-window pick supersedes a queued out-of-window one --
        // otherwise the extension's effect yanks the list to that far month.
        pendingScrollFlatRef.current = null;
        scrollOffsetRef.current = target.offset;
        syncVisibleMonth(target.offset);
        // The target is already laid out (its offset came from the live table),
        // so jump now: a deferred frame only adds latency to a scrub that wants
        // to feel glued to the finger.
        listRef.current?.scrollToOffset({ offset: target.offset, animated });
    }, [layoutTable, maxMonthsAhead, months.length, monthsBack, syncVisibleMonth]);
    useImperativeHandle(gridRef, () => ({
        scrollToToday: (animated = true) => {
            const home = layoutTable[monthsBack];
            if (home) {
                requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: home.offset, animated }));
            }
        },
        scrollToGregorianMonth: (year, month0) => {
            scrollToFlat(system.flatIndexForGregorian(anchorKey, year, month0), false);
        },
        scrollToPage: (key) => {
            const loaded = months.findIndex((m) => m.key === key);
            if (loaded >= 0) {
                scrollToFlat(loaded - monthsBack, false);
                return;
            }
            // Beyond the loaded window: locate it in the full reachable span.
            const all = system.buildPages(anchorKey, monthsBack, maxMonthsAhead, weekStartsOn);
            const i = all.findIndex((m) => m.key === key);
            if (i >= 0)
                scrollToFlat(i - monthsBack, false);
        },
    }), [layoutTable, monthsBack, scrollToFlat, system, anchorKey, months, maxMonthsAhead, weekStartsOn]);
    const getItemLayout = useCallback((_d, index) => ({
        length: layoutTable[index]?.height || 0,
        offset: layoutTable[index]?.offset || 0,
        index,
    }), [layoutTable]);
    const visiblePage = useMemo(() => months.find((m) => m.key === visibleKey) || months[monthsBack] || months[0], [months, visibleKey, monthsBack]);
    useEffect(() => {
        if (visiblePage)
            onVisibleMonthChange?.(visiblePage);
    }, [visiblePage, onVisibleMonthChange]);
    // The slots are fresh closures every render; a stable renderItem reads the
    // latest set through this ref so it never captures a stale one, and the
    // FlatList re-renders its rows off `listExtra` (the month window + the
    // consumer's extraData) rather than off the slot identities.
    const slotsRef = useRef({});
    slotsRef.current = {
        dayBackgroundColor,
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
    const renderItem = useCallback(({ item }) => (_jsx(MonthBlock, { page: item, system: system, rowHeight: rowHeight, weekStartsOn: weekStartsOn, layoutRTL: layoutRTL, todayOrd: anchorOrd, colors: colors, fontFamily: fontFamily, slots: slotsRef.current })), [system, rowHeight, weekStartsOn, layoutRTL, anchorOrd, colors, fontFamily]);
    const weekdayOrder = Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);
    return (_jsxs(View, { style: { flex: 1 }, testID: testID, children: [_jsxs(Pressable, { onPress: onTitlePress, disabled: !onTitlePress, accessibilityRole: onTitlePress ? 'button' : undefined, style: {
                    paddingHorizontal: 16,
                    marginTop: 8,
                    flexDirection: layoutRTL ? 'row-reverse' : 'row',
                    direction: 'ltr',
                    alignItems: 'center',
                    gap: 7,
                }, children: [_jsx(Text, { numberOfLines: 1, style: {
                            color: colors.title,
                            fontSize: 22,
                            fontWeight: '800',
                            fontFamily,
                            textAlign: layoutRTL ? 'right' : 'left',
                            writingDirection: layoutRTL ? 'rtl' : 'ltr',
                        }, children: visiblePage ? system.title(visiblePage) : '' }), onTitlePress ? _jsx(Chevron, { color: colors.muted }) : null, visiblePage ? renderTitleAccessory?.(visiblePage) : null] }), _jsx(View, { style: {
                    // The same inset as the week cards below, so the seven header
                    // columns sit exactly over the seven day columns.
                    paddingLeft: 8 + (layoutRTL ? endInset : 0),
                    paddingRight: 8 + (layoutRTL ? 0 : endInset),
                    marginTop: 10,
                    marginBottom: 4,
                }, children: _jsx(View, { style: { flexDirection: 'row', direction: layoutRTL ? 'rtl' : 'ltr' }, children: weekdayOrder.map((wd) => (_jsx(View, { style: { flex: 1, alignItems: 'center' }, children: _jsx(Text, { style: {
                                color: colors.text,
                                fontSize: 13,
                                fontWeight: '700',
                                fontFamily,
                                textAlign: 'center',
                            }, children: weekdayLabels[wd] }) }, wd))) }) }), _jsxs(View, { style: { flex: 1 }, children: [_jsx(Animated.FlatList, { ref: listRef, style: { flex: 1 }, data: months, keyExtractor: (m) => m.key, renderItem: renderItem, getItemLayout: getItemLayout, initialScrollIndex: initialIndex, snapToOffsets: snapOffsets, disableIntervalMomentum: snapToMonths, decelerationRate: snapToMonths ? 'fast' : 'normal', onLayout: (e) => {
                            listHeightRef.current = e.nativeEvent.layout.height;
                        }, onEndReached: () => setMonthCount((n) => Math.min(maxMonthsAhead, n + extendMonths)), onEndReachedThreshold: 2, onScroll: scrollHandler, scrollEventThrottle: 16, extraData: listExtra, contentContainerStyle: {
                            paddingTop: LIST_TOP_PAD,
                            paddingLeft: 8 + (layoutRTL ? endInset : 0),
                            paddingRight: 8 + (layoutRTL ? 0 : endInset),
                            paddingBottom: 90,
                        }, showsVerticalScrollIndicator: false }), scrollY ? (_jsx(Animated.View, { pointerEvents: "none", style: { position: 'absolute', width: 0, height: 0, transform: [{ translateY: scrollY }] } })) : null, listOverlay] }), footer, showTodayPill && todayLabel ? (_jsx(View, { pointerEvents: "box-none", style: {
                    position: 'absolute',
                    bottom: footer ? 52 : 18,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                }, children: _jsx(Pressable, { onPress: () => {
                        const home = layoutTable[monthsBack];
                        if (home)
                            listRef.current?.scrollToOffset({ offset: home.offset, animated: true });
                    }, accessibilityRole: "button", style: ({ pressed }) => [
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
                    ], children: _jsx(Text, { style: { color: colors.text, fontSize: 13, fontWeight: '700', fontFamily }, children: todayLabel }) }) })) : null] }));
}
/** A down chevron drawn with two strokes -- no icon dependency (this package ships none). */
function Chevron({ color }) {
    const bar = {
        position: 'absolute',
        width: 8,
        height: 1.6,
        borderRadius: 1,
        backgroundColor: color,
    };
    return (_jsxs(View, { style: { width: 14, height: 10, justifyContent: 'center' }, children: [_jsx(View, { style: [bar, { left: 1, transform: [{ rotate: '45deg' }] }] }), _jsx(View, { style: [bar, { right: 1, transform: [{ rotate: '-45deg' }] }] })] }));
}
