/**
 * React Native building blocks for a "the backend is unreachable" state --
 * a full-screen replacement (`StatusScreen`) and a non-blocking inline
 * banner (`StatusBanner`). GateOpen MobileApp hand-rolled both of these
 * (`ServerDownScreen.js`, `ConnectionBanner.js`) and nothing about either
 * one is actually GateOpen-specific once the theme, copy and icon are
 * pulled out into props -- every future RN app of Aviv's needs the same
 * two shapes (a centered full-screen state, a compact inline one) and
 * would otherwise re-copy both by hand.
 *
 * Deliberately excluded, same reasoning as the rest of this package:
 * - No icon library. `icon` is a caller-supplied ReactNode, exactly like
 *   `Container` -- an icon set (Ionicons or otherwise) stays the
 *   consumer's dependency, not this package's.
 * - No default `Container` beyond a plain View. It exists only so a
 *   consumer can drop in their own glass/blur surface (GateOpen's
 *   Liquid-Glass-aware `GlassSurface`) without this package taking on
 *   that dependency -- omit it and both components render exactly what a
 *   plain View wrapper gives you.
 * - No default colors anywhere in `StatusColors`. Same convention as
 *   `tokens.ts`'s DARK/LIGHT: the caller's theme is the only source, this
 *   package never injects a palette of its own.
 */
import type { ComponentType, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

/** The caller's theme, read verbatim -- no defaults, no fallback palette. */
export type StatusColors = {
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  panel: string;
  rim: string;
};

export type StatusAction = {
  label: string;
  onPress: () => void;
};

/**
 * Shape every `Container` override must satisfy -- deliberately just
 * `style` + `children`, the minimum a glass/blur surface needs to slot in
 * as a drop-in replacement for a plain `View`.
 */
type StatusContainerProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export interface StatusScreenProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: StatusAction;
  colors: StatusColors;
  rtl?: boolean;
  Container?: ComponentType<StatusContainerProps>;
  titleStyle?: StyleProp<TextStyle>;
  messageStyle?: StyleProp<TextStyle>;
  actionStyle?: StyleProp<ViewStyle>;
  actionTextStyle?: StyleProp<TextStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface StatusBannerProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  colors: StatusColors;
  rtl?: boolean;
  Container?: ComponentType<StatusContainerProps>;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  messageStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * Full-screen centered state -- an unreachable backend, an empty result, any
 * "nothing to show but here's why and what to do" moment. A ScrollView, not
 * a plain centered View: a short title plus a longer/localized message plus
 * the OS's own "larger text" accessibility setting can together exceed the
 * viewport, and a fixed center would strand `action` off-screen and
 * unreachable.
 */
export function StatusScreen({
  title,
  message,
  icon,
  action,
  colors,
  rtl = false,
  Container,
  titleStyle,
  messageStyle,
  actionStyle,
  actionTextStyle,
  contentContainerStyle,
  testID,
}: StatusScreenProps) {
  const Wrapper: ComponentType<StatusContainerProps> = Container ?? View;
  const writingDirection = rtl ? 'rtl' : 'ltr';

  return (
    <ScrollView
      style={styles.screenScroll}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      testID={testID}
    >
      <Wrapper>
        {icon != null ? <View style={styles.screenIcon}>{icon}</View> : null}
        <Text
          style={[styles.screenTitle, { color: colors.text, writingDirection }, titleStyle]}
        >
          {title}
        </Text>
        {message ? (
          <Text
            style={[
              styles.screenMessage,
              { color: colors.muted, writingDirection },
              messageStyle,
            ]}
          >
            {message}
          </Text>
        ) : null}
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.screenAction,
              { backgroundColor: colors.accent },
              pressed ? styles.screenActionPressed : null,
              actionStyle,
            ]}
          >
            <Text
              style={[styles.screenActionText, { color: colors.onAccent }, actionTextStyle]}
            >
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </Wrapper>
    </ScrollView>
  );
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
export function StatusBanner({
  title,
  message,
  icon,
  colors,
  rtl = false,
  Container,
  style,
  titleStyle,
  messageStyle,
  testID,
}: StatusBannerProps) {
  const Wrapper: ComponentType<StatusContainerProps> = Container ?? View;

  return (
    <Wrapper
      style={[
        styles.bannerContainer,
        { backgroundColor: colors.panel, borderColor: colors.rim },
        style,
      ]}
    >
      <View style={[styles.bannerRow, { direction: rtl ? 'rtl' : 'ltr' }]} testID={testID}>
        {icon != null ? icon : null}
        <View style={[styles.bannerColumn, { direction: 'ltr' }]}>
          <Text
            style={[
              styles.bannerTitle,
              { color: colors.text, textAlign: rtl ? 'right' : 'left' },
              titleStyle,
            ]}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                styles.bannerMessage,
                { color: colors.muted, textAlign: rtl ? 'right' : 'left' },
                messageStyle,
              ]}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </Wrapper>
  );
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
export type {
  CalendarGridProps,
  CalendarGridHandle,
  CalendarColors,
  CalendarDay,
} from './calendar/CalendarGrid';
export { createCalendarSystem, computeDroppedWeeks } from './calendar/formations';
export type { CalendarType, CalendarSystem, MonthPage, DayLabels } from './calendar/formations';
export {
  getMonthGrid,
  getHebrewMonthGrid,
  localDayOrdinal,
  dateFromLocalDayOrdinal,
  DAY_MS,
} from './calendar/grid';
export type { MonthGrid, HebrewMonthGrid } from './calendar/grid';
export {
  gregorianToHebrew,
  hebrewToGregorian,
  hebrewLeapYear,
  lastDayOfHebrewMonth,
  lastMonthOfHebrewYear,
  hebrewMonthsInOrder,
  hebrewMonthOrdinal,
  addHebrewMonths,
  hebrewMonthName,
  hebrewMonthKey,
  hebrewYearLetters,
  hebrewDayLetters,
  // Lower-level R.D. primitives -- a consumer computing its own holiday dates
  // (GateOpen's israelHolidays engine) shares these rather than re-deriving.
  fixedFromHebrew,
  hebrewFromFixed,
} from './calendar/hebrewDate';
export type { HebrewDate } from './calendar/hebrewDate';
export {
  floorDiv,
  mod,
  gregorianLeapYear,
  fixedFromGregorian,
  gregorianFromFixed,
  gregorianYearFromFixed,
} from './calendar/fixedDay';

// ---------------------------------------------------------------------------
// Notifications -- the visual counterpart to ./push's OS-plumbing layer: a
// transient banner and a persistent list/history row, consuming push's own
// NotificationEvent as-is. See ./notifications/README.md.
// ---------------------------------------------------------------------------
export { NotificationBanner, NotificationRow } from './notifications';
export type {
  NotificationBannerProps,
  NotificationDismissDirection,
  NotificationRowProps,
  NotificationAction,
  NotificationColors,
  NotificationContainerProps,
} from './notifications';
