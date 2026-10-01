/**
 * A native edge sheet: rounded panel that slides in from the screen's top
 * or bottom edge over a dimmed scrim, with an optional grab handle and a
 * three-slot header (left / centered title / right) -- iOS's own
 * sheet-with-nav-bar shape, and the same silhouette as a web bottom sheet
 * (rounded corners at the free edge, a centered title between two text
 * buttons, a small grab affordance).
 *
 * Ported from a GateOpen Figma-to-HTML redesign round of the Guests screens
 * (2026-09) -- that prototype's `.sheet`/`.sh-head`/`.grab` were themselves
 * generic (a title row + Cancel/Done + rounded corners), and every future
 * RN app of Aviv's needing a sheet would otherwise re-copy the same shape.
 * `edge: 'top'` added 2026-10-01 for GateOpen's Welcome language picker
 * (Aviv: "come from the top instead a reverse component" -- a dropdown
 * list reads naturally anchored under its own trigger pill near the
 * screen's top, not sliding up from the opposite edge).
 *
 * Deliberately animated with `Animated`, not RN's Modal's own
 * `animationType`, and mounted with `animationType="none"`: a fading Modal
 * blocks touches app-wide for the length of its OWN fade (a real bug this
 * package's first consumer hit and fixed -- see GateOpen's box-dismiss-tap-
 * lag fix). Driving the slide and the scrim's opacity ourselves means the
 * backdrop is tappable the instant it's visible, never a beat late.
 *
 * The sheet slides in from `Dimensions.get('window').height` (negated for
 * `edge: 'top'`), not from its own measured height -- an RN Animated value
 * can't reference "my own height" without a layout round-trip, and
 * starting from the full screen height always fully hides the sheet
 * regardless of its content, at the cost of one extra frame the sheet
 * spends already-off-screen before the slide-in begins (imperceptible in
 * practice).
 *
 * The grab handle sits at the panel's own FREE edge -- the one facing away
 * from the screen edge it's anchored to, since that's the edge a user
 * would actually pull on. For `edge: 'bottom'` (the default) that's the
 * panel's top, grouped with the header into one draggable zone, same as
 * before this prop existed. For `edge: 'top'` that's the panel's bottom,
 * so the header renders separately, near the panel's anchored (top) edge,
 * and only the grabber itself is draggable, after the body. Drag-to-
 * dismiss direction mirrors the same way: pull toward the panel's own free
 * edge to dismiss, rubber-banding slightly the other way.
 *
 * Deliberately excluded, same boundary as the rest of this package: no
 * icon library, no default `Container` beyond a plain `View` (a caller's
 * glass/blur surface can slot in as the sheet's own panel), no default
 * colors anywhere in `SheetColors`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ModalProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { SheetColors } from './types';

type SheetContainerProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export interface SheetHeaderProps {
  /** Usually a Cancel text button, or omitted for a sheet with no way back
   * except its own action buttons. */
  left?: ReactNode;
  title?: ReactNode;
  /** Usually a Done text button. */
  right?: ReactNode;
  colors: Pick<SheetColors, 'text'>;
  rtl?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The header row alone, exported separately so a caller building a fully
 * custom sheet body still gets the same title-centering grid (three equal
 * flex slots -- the title stays centered whatever `left`/`right` end up
 * measuring, rather than the common bug of a title that drifts toward
 * whichever side is empty).
 */
export function SheetHeader({
  left,
  title,
  right,
  colors,
  rtl = false,
  titleStyle,
  style,
  testID,
}: SheetHeaderProps) {
  return (
    <View
      style={[
        styles.header,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.headerSlot}>{left}</View>
      <View style={styles.headerTitleSlot}>
        {typeof title === 'string' ? (
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: colors.text }, titleStyle]}
          >
            {title}
          </Text>
        ) : (
          title
        )}
      </View>
      <View style={[styles.headerSlot, styles.headerSlotEnd]}>{right}</View>
    </View>
  );
}

export interface BottomSheetProps {
  visible: boolean;
  /** Backdrop tap and the Android hardware back button both call this --
   * same as every other dismiss path in this component, it does not close
   * the sheet itself. The caller owns `visible`. */
  onRequestClose: () => void;
  colors: SheetColors;
  rtl?: boolean;
  /** Which screen edge the panel anchors to and slides in from. Default
   * `'bottom'` -- the original, only ever shape this component had before
   * `'top'` was added. */
  edge?: 'bottom' | 'top';
  children?: ReactNode;
  /** A fully custom header; takes over from `title`/`headerLeft`/
   * `headerRight` when given. */
  header?: ReactNode;
  title?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  /** Default `true` -- the small grab affordance at the panel's free edge,
   * which (with `dragToDismiss`) really does drag: pulling it toward that
   * free edge past `dismissDragDistance` calls `onRequestClose`. */
  showGrabber?: boolean;
  /** Default `true`. A drag toward the panel's free edge on the grabber
   * (+ header, for `edge: 'bottom'`) zone follows the finger and, released
   * past `dismissDragDistance` (or flicked), asks to close. Only that zone
   * is draggable on purpose: the body may scroll, and a body-wide drag
   * would fight it. */
  dragToDismiss?: boolean;
  /** Default 80 (points). */
  dismissDragDistance?: number;
  /** Fraction of the window height the sheet may grow to before its body
   * scrolls internally. Default 0.92, matching the ported prototype. */
  maxHeightRatio?: number;
  animationDuration?: number;
  Container?: ComponentType<SheetContainerProps>;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Spread onto the underlying `Modal` -- a consumer's own
   * presentation-mode conventions (e.g. `statusBarTranslucent`,
   * `presentationStyle`) without this package needing to know them. */
  modalProps?: Partial<ModalProps>;
  /** Fires once the close animation has finished and the Modal has actually
   * un-mounted -- the moment it is safe to present ANOTHER Modal-backed
   * surface. Presenting one while this sheet's Modal is still leaving is
   * silently dropped on iOS (a real bug GateOpen gates every dialog chain
   * on), so a caller opening a follow-up sheet/dialog from a choice made
   * here should do it from this callback, not from `onRequestClose`. */
  onExited?: () => void;
  testID?: string;
}

/**
 * `BottomSheet` owns presentation (scrim, slide, rounded panel, optional
 * header); it never owns whether it's open. Mount it once per sheet and
 * flip `visible`, the same lifecycle every other component in this package
 * uses. The name predates `edge: 'top'` and stays for compatibility --
 * every existing caller is a bottom sheet, and "EdgeSheet" would have cost
 * every one of them a rename for no behavior change.
 */
export function BottomSheet({
  visible,
  onRequestClose,
  colors,
  rtl = false,
  edge = 'bottom',
  children,
  header,
  title,
  headerLeft,
  headerRight,
  showGrabber = true,
  dragToDismiss = true,
  dismissDragDistance = 80,
  maxHeightRatio = 0.92,
  animationDuration = 240,
  Container,
  style,
  contentContainerStyle,
  modalProps,
  onExited,
  testID,
}: BottomSheetProps) {
  const top = edge === 'top';
  const screenHeight = useMemo(() => Dimensions.get('window').height, []);
  const hiddenY = top ? -screenHeight : screenHeight;
  const translateY = useRef(new Animated.Value(hiddenY)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  // The Modal itself un-mounts only once the close animation finishes, or
  // the sheet would vanish instantly (no slide) the moment a caller flips
  // `visible` to false.
  const mounted = useAnimatedMount(visible, animationDuration, onExited);

  // Drag-to-dismiss on the grab zone. Reads the latest props through refs
  // so the responder (created once) never closes over a stale callback.
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;
  const dragDistanceRef = useRef(dismissDragDistance);
  dragDistanceRef.current = dismissDragDistance;
  const dragEnabledRef = useRef(dragToDismiss);
  dragEnabledRef.current = dragToDismiss;
  // A gesture already in progress when the caller (or this same drag's own
  // release) flips `visible` false must stop touching `translateY` at
  // once: the CLOSE `Animated.timing` below (useNativeDriver: true) is
  // about to own that node, and a JS-driven `setValue` racing it there is a
  // real Animated invariant violation, not just a visual glitch --
  // reproduced live as a "drag" error right after a drag-to-dismiss close.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const dragPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        visibleRef.current &&
        dragEnabledRef.current &&
        (top ? g.dy < -6 : g.dy > 6) &&
        Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        visibleRef.current &&
        dragEnabledRef.current &&
        (top ? g.dy < -6 : g.dy > 6) &&
        Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (!visibleRef.current) return;
        // Full 1:1 tracking toward the panel's free edge, in BOTH
        // directions once the gesture has engaged -- a drag that reverses
        // mid-gesture (up past the activation threshold, then back down)
        // follows the finger back just as precisely, not damped. Only
        // clamped at 0 (the resting, fully-shown position): nothing past
        // it to reveal, so going further would just open a gap between
        // the panel's own anchored edge and the real screen edge.
        if (top) {
          translateY.setValue(Math.min(g.dy, 0));
        } else {
          translateY.setValue(Math.max(g.dy, 0));
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (!visibleRef.current) return;
        const shouldClose = top
          ? g.dy < -dragDistanceRef.current || g.vy < -0.8
          : g.dy > dragDistanceRef.current || g.vy > 0.8;
        if (shouldClose) {
          onRequestCloseRef.current();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        if (!visibleRef.current) return;
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: hiddenY,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // translateY/scrimOpacity/hiddenY are refs/derived from a memo -- stable
    // identity, deliberately left out so this effect only re-fires on the
    // props that actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, animationDuration]);

  if (!mounted) return null;

  const Wrapper: ComponentType<SheetContainerProps> = Container ?? View;
  const resolvedHeader =
    header !== undefined
      ? header
      : title !== undefined || headerLeft !== undefined || headerRight !== undefined
        ? (
            <SheetHeader
              left={headerLeft}
              title={title}
              right={headerRight}
              colors={colors}
              rtl={rtl}
            />
          )
        : null;

  const grabZoneProps = visible && dragToDismiss ? dragPan.panHandlers : null;
  const grabber = showGrabber ? (
    <View style={[styles.grabber, { backgroundColor: colors.rim }]} />
  ) : null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      testID={testID}
      {...modalProps}
    >
      {/* pointerEvents gated by `visible`, not `mounted`: this Pressable
          is StyleSheet.absoluteFillObject over the WHOLE screen, and the
          Modal stays mounted for the length of the exit animation (see
          useAnimatedMount) so the slide actually plays. Ungated, it
          swallowed every touch on the entire screen -- including ones
          meant for whatever is underneath, like a guest page's preview
          button -- for that whole window after a caller (or a
          drag-to-dismiss release) already flipped `visible` false. */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        pointerEvents={visible ? 'auto' : 'none'}
        onPress={onRequestClose}
        accessibilityRole="button"
        accessibilityLabel="dismiss"
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.scrim, opacity: scrimOpacity },
          ]}
        />
      </Pressable>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.sheet,
          top ? styles.sheetTop : styles.sheetBottom,
          {
            backgroundColor: colors.panel,
            maxHeight: `${maxHeightRatio * 100}%`,
            transform: [{ translateY }],
          },
          style,
        ]}
      >
        {/* Swallow taps so they don't fall through to the backdrop
            Pressable behind this panel. */}
        <Pressable onPress={() => {}} style={styles.sheetInner}>
          <Wrapper style={styles.sheetInner}>
            {top ? (
              <>
                {/* `edge: 'top'`: header sits at the panel's anchored
                    (top) edge, NOT part of the draggable zone -- only the
                    grabber, at the panel's own free (bottom) edge after
                    the body, is. See this file's module doc. */}
                {resolvedHeader}
                <View style={[styles.body, contentContainerStyle]}>{children}</View>
                <View style={styles.dragZone} {...grabZoneProps}>
                  {grabber}
                </View>
              </>
            ) : (
              <>
                {/* `edge: 'bottom'` (default, unchanged from before `edge`
                    existed): grabber + header together form one draggable
                    zone at the panel's own free (top) edge. */}
                <View style={styles.dragZone} {...grabZoneProps}>
                  {grabber}
                  {resolvedHeader}
                </View>
                <View style={[styles.body, contentContainerStyle]}>{children}</View>
              </>
            )}
          </Wrapper>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

/**
 * Keeps the sheet mounted for one more `duration` after `visible` goes
 * false, so the slide-out and scrim fade actually play instead of the
 * Modal disappearing on the same frame the caller flips the flag.
 */
function useAnimatedMount(
  visible: boolean,
  duration: number,
  onExited?: () => void,
): boolean {
  const [mounted, setMounted] = useState(visible);
  // Read through a ref so a caller passing a fresh arrow every render
  // doesn't restart the un-mount timer mid-exit.
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      return undefined;
    }
    const timer = setTimeout(() => {
      setMounted(false);
      onExitedRef.current?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration]);
  return mounted;
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  sheetBottom: {
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetTop: {
    top: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  sheetInner: {
    flexShrink: 1,
  },
  // 44, not the grabber's own ~21px (5 + 8 margin top/bottom): Apple's HIG
  // minimum touch target. For `edge: 'bottom'` this zone also contains the
  // header, whose own 44 `minHeight` already covered it -- but `edge:
  // 'top'` (grabber alone, after the body, see this file's module doc)
  // had nothing else supplying that height, so its real touchable area
  // was the grabber's own ~21px. A small, careful drag starting just
  // outside that strip missed the responder entirely and did nothing; a
  // fast big one that happened to land on it read as a flick straight
  // past the dismiss threshold -- exactly "little drags do nothing, big
  // ones just close it" (Aviv, on-device).
  dragZone: {
    minHeight: 44,
    width: '100%',
    justifyContent: 'center',
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
    minHeight: 44,
    // Pinned: `rtl` (row-reverse) must mean what it says even under a host
    // that mirrors every plain row itself (GateOpen's hand-mirrored RTL
    // shell), where an un-pinned row-reverse flips BACK to LTR.
    direction: 'ltr',
  },
  headerSlot: {
    flex: 1,
    minWidth: 44,
    justifyContent: 'center',
  },
  headerSlotEnd: {
    alignItems: 'flex-end',
  },
  headerTitleSlot: {
    flex: 2,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
});
