import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
/**
 * Full-screen centered state -- an unreachable backend, an empty result, any
 * "nothing to show but here's why and what to do" moment. A ScrollView, not
 * a plain centered View: a short title plus a longer/localized message plus
 * the OS's own "larger text" accessibility setting can together exceed the
 * viewport, and a fixed center would strand `action` off-screen and
 * unreachable.
 */
export function StatusScreen({ title, message, icon, action, colors, rtl = false, Container, titleStyle, messageStyle, actionStyle, actionTextStyle, contentContainerStyle, testID, }) {
    const Wrapper = Container ?? View;
    const writingDirection = rtl ? 'rtl' : 'ltr';
    return (_jsx(ScrollView, { style: styles.screenScroll, keyboardShouldPersistTaps: "handled", contentContainerStyle: [styles.screenContent, contentContainerStyle], testID: testID, children: _jsxs(Wrapper, { children: [icon != null ? _jsx(View, { style: styles.screenIcon, children: icon }) : null, _jsx(Text, { style: [styles.screenTitle, { color: colors.text, writingDirection }, titleStyle], children: title }), message ? (_jsx(Text, { style: [
                        styles.screenMessage,
                        { color: colors.muted, writingDirection },
                        messageStyle,
                    ], children: message })) : null, action ? (_jsx(Pressable, { onPress: action.onPress, accessibilityRole: "button", style: ({ pressed }) => [
                        styles.screenAction,
                        { backgroundColor: colors.accent },
                        pressed ? styles.screenActionPressed : null,
                        actionStyle,
                    ], children: _jsx(Text, { style: [styles.screenActionText, { color: colors.onAccent }, actionTextStyle], children: action.label }) })) : null] }) }));
}
/**
 * Non-blocking inline banner for the same kind of state -- rendered
 * alongside content that still works (e.g. cached data) rather than
 * replacing it.
 *
 * RTL: the outer row stays plain `flexDirection: 'row'` with icon-then-column
 * JSX order and gets its OWN `direction` from `rtl` -- Yoga mirrors a plain
 * 'row' for you when direction is 'rtl', landing the icon at the reading-start
 * edge in both directions. `flexDirection: 'row-reverse'` is deliberately
 * NOT used here: it would flip a second time on top of the direction flip and
 * put the icon at the wrong edge (the bug this replaces).
 *
 * The inner column then pins its OWN `direction` back to 'ltr'. This isn't
 * decorative: on RN 0.81's new architecture, a Text's `textAlign: 'left' |
 * 'right'` is resolved as LOGICAL (start/end) rather than physical once that
 * Text's own resolved layout direction is RTL -- and direction is inherited,
 * so without this the column (and the Text children in it) would inherit the
 * row's 'rtl' and silently flip `textAlign: rtl ? 'right' : 'left'` to the
 * wrong physical edge. Pinning the column to 'ltr' keeps its resolved
 * direction LTR regardless of the row around it, so 'left'/'right' stay
 * genuinely physical and the title/message land flush against the edge
 * closest to the icon in both directions.
 */
export function StatusBanner({ title, message, icon, colors, rtl = false, Container, style, titleStyle, messageStyle, testID, }) {
    const Wrapper = Container ?? View;
    return (_jsx(Wrapper, { style: [
            styles.bannerContainer,
            { backgroundColor: colors.panel, borderColor: colors.rim },
            style,
        ], children: _jsxs(View, { style: [styles.bannerRow, { direction: rtl ? 'rtl' : 'ltr' }], testID: testID, children: [icon != null ? icon : null, _jsxs(View, { style: [styles.bannerColumn, { direction: 'ltr' }], children: [_jsx(Text, { style: [
                                styles.bannerTitle,
                                { color: colors.text, textAlign: rtl ? 'right' : 'left' },
                                titleStyle,
                            ], children: title }), message ? (_jsx(Text, { style: [
                                styles.bannerMessage,
                                { color: colors.muted, textAlign: rtl ? 'right' : 'left' },
                                messageStyle,
                            ], children: message })) : null] })] }) }));
}
const styles = StyleSheet.create({
    screenScroll: {
        flex: 1,
    },
    screenContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    screenIcon: {
        marginBottom: 16,
        // Centers an arbitrary caller-sized icon that doesn't fill the row's
        // width -- without this it would sit at the View's stretch-default
        // cross-start edge instead of in the middle of the screen.
        alignItems: 'center',
    },
    screenTitle: {
        textAlign: 'center',
    },
    screenMessage: {
        textAlign: 'center',
        marginTop: 8,
    },
    screenAction: {
        marginTop: 24,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        minWidth: 160,
        // A plain View's default alignItems is 'stretch'; without this the pill
        // would stretch to the full content width instead of staying a pill.
        alignSelf: 'center',
        // The label is centered by the PILL, not by the label's own textAlign,
        // and the pill has to be a row for that to work: Yoga applies minWidth
        // on a container's CROSS axis only after its children are already
        // placed, so in the default column layout a short label sits at the
        // cross-start edge of a 160pt pill (left in LTR, right in RTL -- the
        // "text isn't in the middle of the button" bug). With the width on the
        // MAIN axis instead, minWidth is applied before justifyContent
        // distributes the free space, so the label lands in the middle whatever
        // its length, its writingDirection, or any width/textAlign a caller's
        // actionTextStyle adds on top.
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenActionPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.985 }],
    },
    screenActionText: {
        fontWeight: '700',
        textAlign: 'center',
        // Wrap a long localized label inside the pill (RN's default flexShrink is
        // 0, which would let it push past the padding instead).
        flexShrink: 1,
    },
    bannerContainer: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: StyleSheet.hairlineWidth,
    },
    bannerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    bannerColumn: {
        flex: 1,
    },
    bannerTitle: {
        fontWeight: '700',
    },
    bannerMessage: {
        marginTop: 2,
    },
});
// ---------------------------------------------------------------------------
// Calendar -- a reusable month-grid calendar (gregorian / hebrew / mixed) and
// the pure date arithmetic behind it. The formations live in the library, not
// as scattered cases in a consumer, and the day math is one implementation
// every app of Aviv's shares. See ./calendar/*.
// ---------------------------------------------------------------------------
export { CalendarGrid } from './calendar/CalendarGrid';
export { createCalendarSystem, computeDroppedWeeks } from './calendar/formations';
export { getMonthGrid, getHebrewMonthGrid, localDayOrdinal, dateFromLocalDayOrdinal, DAY_MS, } from './calendar/grid';
export { gregorianToHebrew, hebrewToGregorian, hebrewLeapYear, lastDayOfHebrewMonth, lastMonthOfHebrewYear, hebrewMonthsInOrder, hebrewMonthOrdinal, addHebrewMonths, hebrewMonthName, hebrewMonthKey, hebrewYearLetters, hebrewDayLetters, 
// Lower-level R.D. primitives -- a consumer computing its own holiday dates
// (GateOpen's israelHolidays engine) shares these rather than re-deriving.
fixedFromHebrew, hebrewFromFixed, } from './calendar/hebrewDate';
export { floorDiv, mod, gregorianLeapYear, fixedFromGregorian, gregorianFromFixed, gregorianYearFromFixed, } from './calendar/fixedDay';
// ---------------------------------------------------------------------------
// Notifications -- the visual counterpart to ./push's OS-plumbing layer: a
// transient banner and a persistent list/history row, consuming push's own
// NotificationEvent as-is. See ./notifications/README.md.
// ---------------------------------------------------------------------------
export { NotificationBanner, NotificationRow } from './notifications';
