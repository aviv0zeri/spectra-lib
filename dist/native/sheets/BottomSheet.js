import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A native bottom sheet: rounded-top panel that slides up from the bottom
 * over a dimmed scrim, with an optional grab handle and a three-slot header
 * (left / centered title / right) -- iOS's own sheet-with-nav-bar shape,
 * and the same silhouette as a web bottom sheet (rounded top corners, a
 * centered title between two text buttons, a small grab affordance).
 *
 * Ported from a GateOpen Figma-to-HTML redesign round of the Guests screens
 * (2026-09) -- that prototype's `.sheet`/`.sh-head`/`.grab` were themselves
 * generic (a title row + Cancel/Done + rounded corners), and every future
 * RN app of Aviv's needing a sheet would otherwise re-copy the same shape.
 *
 * Deliberately animated with `Animated`, not RN's Modal's own
 * `animationType`, and mounted with `animationType="none"`: a fading Modal
 * blocks touches app-wide for the length of its OWN fade (a real bug this
 * package's first consumer hit and fixed -- see GateOpen's box-dismiss-tap-
 * lag fix). Driving the slide and the scrim's opacity ourselves means the
 * backdrop is tappable the instant it's visible, never a beat late.
 *
 * The sheet slides up from `Dimensions.get('window').height`, not from its
 * own measured height -- an RN Animated value can't reference "my own
 * height" without a layout round-trip, and starting from the full screen
 * height always fully hides the sheet regardless of its content, at the
 * cost of one extra frame the sheet spends already-off-screen before the
 * slide-in begins (imperceptible in practice).
 *
 * Deliberately excluded, same boundary as the rest of this package: no
 * icon library, no default `Container` beyond a plain `View` (a caller's
 * glass/blur surface can slot in as the sheet's own panel), no default
 * colors anywhere in `SheetColors`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View, } from 'react-native';
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
 * uses.
 */
export function BottomSheet({ visible, onRequestClose, colors, rtl = false, children, header, title, headerLeft, headerRight, showGrabber = true, maxHeightRatio = 0.92, animationDuration = 240, Container, style, contentContainerStyle, modalProps, onExited, testID, }) {
    const screenHeight = useMemo(() => Dimensions.get('window').height, []);
    const translateY = useRef(new Animated.Value(screenHeight)).current;
    const scrimOpacity = useRef(new Animated.Value(0)).current;
    // The Modal itself un-mounts only once the close animation finishes, or
    // the sheet would vanish instantly (no slide-down) the moment a caller
    // flips `visible` to false.
    const mounted = useAnimatedMount(visible, animationDuration, onExited);
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
        }
        else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: screenHeight,
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
        // translateY/scrimOpacity/screenHeight are refs/memo -- stable identity,
        // deliberately left out so this effect only re-fires on the props that
        // actually change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, animationDuration]);
    if (!mounted)
        return null;
    const Wrapper = Container ?? View;
    const resolvedHeader = header !== undefined
        ? header
        : title !== undefined || headerLeft !== undefined || headerRight !== undefined
            ? (_jsx(SheetHeader, { left: headerLeft, title: title, right: headerRight, colors: colors, rtl: rtl }))
            : null;
    return (_jsxs(Modal, { visible: true, transparent: true, animationType: "none", onRequestClose: onRequestClose, statusBarTranslucent: true, testID: testID, ...modalProps, children: [_jsx(Pressable, { style: StyleSheet.absoluteFillObject, onPress: onRequestClose, accessibilityRole: "button", accessibilityLabel: "dismiss", children: _jsx(Animated.View, { style: [
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: colors.scrim, opacity: scrimOpacity },
                    ] }) }), _jsx(Animated.View, { style: [
                    styles.sheet,
                    {
                        backgroundColor: colors.panel,
                        maxHeight: `${maxHeightRatio * 100}%`,
                        transform: [{ translateY }],
                    },
                    style,
                ], children: _jsx(Pressable, { onPress: () => { }, style: styles.sheetInner, children: _jsxs(Wrapper, { style: styles.sheetInner, children: [showGrabber ? (_jsx(View, { style: [styles.grabber, { backgroundColor: colors.rim }] })) : null, resolvedHeader, _jsx(View, { style: [styles.body, contentContainerStyle], children: children })] }) }) })] }));
}
/**
 * Keeps the sheet mounted for one more `duration` after `visible` goes
 * false, so the slide-down and scrim fade actually play instead of the
 * Modal disappearing on the same frame the caller flips the flag.
 */
function useAnimatedMount(visible, duration, onExited) {
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
        bottom: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    sheetInner: {
        flexShrink: 1,
    },
    grabber: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 8,
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
