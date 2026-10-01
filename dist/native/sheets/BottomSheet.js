import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
 * Drag-to-dismiss runs on react-native-gesture-handler's Gesture.Pan() +
 * react-native-reanimated shared values, not RN's own PanResponder +
 * Animated (what every earlier version of this file used). That's not a
 * style preference -- PanResponder's move/release callbacks run on the JS
 * thread, round-tripping every touch sample through the bridge before a
 * `translateY.setValue()` can take effect; under any JS-thread load (or
 * sometimes none at all) that reads as exactly what Aviv hit live:
 * "either closes from a big push or nothing, no little drags." Gesture
 * Pan's `.onChange`/`.onEnd` are worklets -- they run ON the UI thread,
 * same thread the rendered transform lives on, no round trip, which is
 * the same architecture every serious RN sheet (gorhom/react-native-
 * bottom-sheet chief among them) uses for exactly this reason. See
 * `panGesture` below.
 *
 * Still mounted with Modal's own `animationType="none"` and animated by
 * hand: a fading Modal blocks touches app-wide for the length of its OWN
 * fade (a real bug this package's first consumer hit and fixed -- see
 * GateOpen's box-dismiss-tap-lag fix). Driving the slide and the scrim's
 * opacity ourselves means the backdrop is tappable the instant it's
 * visible, never a beat late.
 *
 * The sheet slides in from `Dimensions.get('window').height` (negated for
 * `edge: 'top'`), not from its own measured height -- a shared value can't
 * reference "my own height" without a layout round-trip, and starting
 * from the full screen height always fully hides the sheet regardless of
 * its content, at the cost of one extra frame the sheet spends
 * already-off-screen before the slide-in begins (imperceptible in
 * practice).
 *
 * The grab handle sits at the panel's own FREE edge -- the one facing away
 * from the screen edge it's anchored to, since that's the edge a user
 * would actually pull on. For `edge: 'bottom'` (the default) that's the
 * panel's top, grouped with the header into one draggable zone, same as
 * before `edge` existed. For `edge: 'top'` that's the panel's bottom, so
 * the header renders separately, near the panel's anchored (top) edge,
 * and only the grabber itself is draggable, after the body. Drag-to-
 * dismiss direction mirrors the same way: pull toward the panel's own
 * free edge to dismiss, clamped (not rubber-banded) the other way -- full
 * 1:1 tracking in both directions, right up to the resting position, that
 * being the whole point of moving off PanResponder. The zone itself is a
 * 44pt-minimum touch target (Apple's HIG minimum) regardless of edge --
 * for `edge: 'bottom'` the header's own 44 `minHeight` already covered
 * that; for `edge: 'top'` (grabber alone) it didn't, and the resulting
 * ~21px zone was the real cause of the "no little drags" symptom above,
 * not the drag physics themselves.
 *
 * Deliberately excluded, same boundary as the rest of this package: no
 * icon library, no default `Container` beyond a plain `View` (a caller's
 * glass/blur surface can slot in as the sheet's own panel), no default
 * colors anywhere in `SheetColors`.
 */
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, } from 'react-native-reanimated';
/**
 * The header row alone, exported separately so a caller building a fully
 * custom sheet body still gets the same title-centering grid (three equal
 * flex slots -- the title stays centered whatever `left`/`right` end up
 * measuring, rather than the common bug of a title that drifts toward
 * whichever side is empty).
 */
export function SheetHeader({ left, title, right, colors, rtl = false, titleStyle, style, testID, }) {
    return (_jsxs(View, { style: [
            styles.header,
            { flexDirection: rtl ? 'row-reverse' : 'row' },
            style,
        ], testID: testID, children: [_jsx(View, { style: styles.headerSlot, children: left }), _jsx(View, { style: styles.headerTitleSlot, children: typeof title === 'string' ? (_jsx(Text, { numberOfLines: 1, style: [styles.headerTitle, { color: colors.text }, titleStyle], children: title })) : (title) }), _jsx(View, { style: [styles.headerSlot, styles.headerSlotEnd], children: right })] }));
}
/**
 * `BottomSheet` owns presentation (scrim, slide, rounded panel, optional
 * header); it never owns whether it's open. Mount it once per sheet and
 * flip `visible`, the same lifecycle every other component in this package
 * uses. The name predates `edge: 'top'` and stays for compatibility --
 * every existing caller is a bottom sheet, and "EdgeSheet" would have cost
 * every one of them a rename for no behavior change.
 */
export function BottomSheet({ visible, onRequestClose, colors, rtl = false, edge = 'bottom', children, header, title, headerLeft, headerRight, showGrabber = true, dragToDismiss = true, dismissDragDistance = 80, maxHeightRatio = 0.92, animationDuration = 240, Container, style, contentContainerStyle, modalProps, onExited, testID, }) {
    const top = edge === 'top';
    const screenHeight = useMemo(() => Dimensions.get('window').height, []);
    const hiddenY = top ? -screenHeight : screenHeight;
    const translateY = useSharedValue(hiddenY);
    const scrimOpacity = useSharedValue(0);
    // The Modal itself un-mounts only once the close animation finishes, or
    // the sheet would vanish instantly (no slide) the moment a caller flips
    // `visible` to false.
    const mounted = useAnimatedMount(visible, animationDuration, onExited);
    useEffect(() => {
        translateY.value = withTiming(visible ? 0 : hiddenY, { duration: animationDuration });
        // No withTiming here: the panel's own slide (above) is the sheet's one
        // animated exit, whether it's triggered by a caller flipping `visible`
        // or by a drag-release past the dismiss threshold. A timed scrim
        // cross-fade on top of that read as a second, competing animation --
        // most visible right after a drag dismiss, where the scrim would fade
        // on its own 240ms clock while the panel's slide is already mid-flight
        // (or already done). The scrim now just tracks `visible` directly.
        scrimOpacity.value = visible ? 1 : 0;
        // translateY/scrimOpacity are shared values -- stable identity,
        // deliberately left out so this effect only re-fires on the props
        // that actually change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, animationDuration, hiddenY]);
    // Built fresh each render (not behind useRef/useMemo with an empty dep
    // array) so every worklet closure below -- `top`, `dismissDragDistance`,
    // `onRequestClose` -- is always this render's actual value. Reanimated's
    // babel plugin captures referenced outer variables BY VALUE at the point
    // the gesture object is constructed, so a gesture built once and reused
    // across renders would permanently close over whatever those props were
    // on the FIRST render -- rebuilding it is what keeps it current, same
    // reasoning the old PanResponder version used refs for.
    const panGesture = Gesture.Pan()
        .enabled(visible && dragToDismiss)
        // Vertical-only: fails (hands off to whatever's underneath, e.g. a
        // horizontal swipe elsewhere) if the gesture moves mostly sideways,
        // activates once it's moved `activationDistance` toward the panel's
        // own free edge.
        .failOffsetX([-12, 12])
        .activeOffsetY(top ? [-12, 1000] : [-1000, 12])
        .onChange((e) => {
        'worklet';
        // Full 1:1 tracking toward the panel's free edge, in BOTH
        // directions once the gesture has engaged -- a drag that reverses
        // mid-gesture follows the finger back just as precisely, not
        // damped. `e.translationY` is cumulative from the gesture's own
        // start (where `translateY.value` is always 0, the resting
        // position -- this only runs while `visible`), so it can be
        // applied directly rather than accumulated by hand. Clamped at 0:
        // nothing past the resting position to reveal, so going further
        // would just open a gap between the panel's own anchored edge and
        // the real screen edge.
        translateY.value = top ? Math.min(e.translationY, 0) : Math.max(e.translationY, 0);
    })
        .onEnd((e) => {
        'worklet';
        const shouldClose = top
            ? e.translationY < -dismissDragDistance || e.velocityY < -800
            : e.translationY > dismissDragDistance || e.velocityY > 800;
        if (shouldClose) {
            runOnJS(onRequestClose)();
            return;
        }
        translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    })
        .onFinalize((e, success) => {
        'worklet';
        // Gesture cancelled (e.g. an ancestor claimed it) rather than
        // released normally -- spring back same as a release that didn't
        // clear the dismiss threshold, mirroring the old PanResponder
        // version's onPanResponderTerminate.
        if (!success) {
            translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
        }
    });
    const sheetAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));
    const scrimAnimatedStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
    if (!mounted)
        return null;
    const Wrapper = Container ?? View;
    const resolvedHeader = header !== undefined
        ? header
        : title !== undefined || headerLeft !== undefined || headerRight !== undefined
            ? (_jsx(SheetHeader, { left: headerLeft, title: title, right: headerRight, colors: colors, rtl: rtl }))
            : null;
    const grabber = showGrabber ? (_jsx(View, { style: [styles.grabber, { backgroundColor: colors.rim }] })) : null;
    const dragZone = (_jsx(GestureDetector, { gesture: panGesture, children: _jsx(View, { style: styles.dragZone, children: top ? grabber : (_jsxs(_Fragment, { children: [grabber, resolvedHeader] })) }) }));
    return (_jsxs(Modal, { visible: true, transparent: true, animationType: "none", onRequestClose: onRequestClose, statusBarTranslucent: true, testID: testID, ...modalProps, children: [_jsx(Pressable, { style: StyleSheet.absoluteFillObject, pointerEvents: visible ? 'auto' : 'none', onPress: onRequestClose, accessibilityRole: "button", accessibilityLabel: "dismiss", children: _jsx(Animated.View, { style: [
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: colors.scrim },
                        scrimAnimatedStyle,
                    ] }) }), _jsx(Animated.View, { pointerEvents: visible ? 'auto' : 'none', style: [
                    styles.sheet,
                    top ? styles.sheetTop : styles.sheetBottom,
                    {
                        backgroundColor: colors.panel,
                        maxHeight: `${maxHeightRatio * 100}%`,
                    },
                    sheetAnimatedStyle,
                    style,
                ], children: _jsx(Pressable, { onPress: () => { }, style: styles.sheetInner, children: _jsx(Wrapper, { style: styles.sheetInner, children: top ? (_jsxs(_Fragment, { children: [resolvedHeader, _jsx(View, { style: [styles.body, contentContainerStyle], children: children }), dragZone] })) : (_jsxs(_Fragment, { children: [dragZone, _jsx(View, { style: [styles.body, contentContainerStyle], children: children })] })) }) }) })] }));
}
/**
 * Keeps the sheet mounted for one more `duration` after `visible` goes
 * false, so the slide-out and scrim fade actually play instead of the
 * Modal disappearing on the same frame the caller flips the flag.
 */
function useAnimatedMount(visible, duration, onExited) {
    const [mounted, setMounted] = useState(visible);
    useEffect(() => {
        if (visible) {
            setMounted(true);
            return undefined;
        }
        const timer = setTimeout(() => {
            setMounted(false);
            onExited?.();
        }, duration);
        return () => clearTimeout(timer);
        // `onExited` deliberately excluded: a caller passing a fresh arrow
        // every render must not restart this timer mid-exit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // was the grabber's own ~21px.
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
