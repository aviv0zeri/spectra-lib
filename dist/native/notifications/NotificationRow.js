import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A persistent list/history item -- matches iOS's Notification Center row
 * and Android's notification-shade card. Swipe toward the reading-end edge
 * (left in LTR, right in RTL) to reveal `actions` -- the same gesture iOS's
 * Notification Center uses to reveal Clear/Options -- and continue past a
 * further threshold to dismiss outright, matching Android's plain
 * swipe-away. With no `actions` supplied, any swipe past the dismiss
 * threshold removes the row directly.
 *
 * Swiping is not the only way to reach `actions`/dismiss: this row also
 * exposes them as `accessibilityActions`/`onAccessibilityAction`, so
 * VoiceOver/TalkBack users get full parity without performing a drag
 * gesture -- gesture-only affordances are otherwise invisible to a screen
 * reader.
 *
 * Same boundary as the rest of this package: no icon library, no default
 * `Container`, no default colors.
 */
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, } from 'react-native';
const ACTION_WIDTH = 76;
const MOVE_THRESHOLD = 4;
const DEFAULT_ROW_WIDTH = 320;
const DISMISS_MARGIN = 40;
export function NotificationRow({ id: _id, event, timestamp, icon, unreadIndicator, read = true, actions, colors, rtl = false, onPress, onDismiss, Container, style, titleStyle, bodyStyle, timestampStyle, testID, }) {
    const Wrapper = Container ?? View;
    const writingDirection = rtl ? 'rtl' : 'ltr';
    // Physical sign of "swipe toward the reading-end edge": in LTR that's
    // left (negative dx); in RTL, actions live on the left so revealing them
    // is a rightward (positive dx) swipe.
    const revealSign = rtl ? 1 : -1;
    const translateX = useRef(new Animated.Value(0)).current;
    const rowWidthRef = useRef(DEFAULT_ROW_WIDTH);
    const [revealed, setRevealed] = useState(false);
    const revealedRef = useRef(false);
    const dismissedRef = useRef(false);
    const revealWidth = Math.max(1, actions?.length ?? 0) * ACTION_WIDTH;
    const dismissDistance = revealWidth + DISMISS_MARGIN;
    const setRevealedState = (value) => {
        revealedRef.current = value;
        setRevealed(value);
    };
    const animateTo = (toValue, onEnd) => {
        Animated.spring(translateX, { toValue, useNativeDriver: true, bounciness: 4 }).start(onEnd);
    };
    const snapClosed = () => {
        setRevealedState(false);
        animateTo(0);
    };
    const snapOpen = () => {
        if (!actions || actions.length === 0)
            return;
        setRevealedState(true);
        animateTo(revealSign * revealWidth);
    };
    const dismiss = () => {
        if (dismissedRef.current)
            return;
        dismissedRef.current = true;
        const exitTo = revealSign * (rowWidthRef.current + revealWidth + DISMISS_MARGIN);
        Animated.timing(translateX, { toValue: exitTo, duration: 180, useNativeDriver: true }).start(() => onDismiss?.());
    };
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > MOVE_THRESHOLD,
        onPanResponderMove: (_evt, gesture) => {
            const base = revealedRef.current ? revealSign * revealWidth : 0;
            let next = base + gesture.dx;
            // Clamp: can't drag past fully-closed on the non-reveal side, and
            // dragging further past the dismiss point rubber-bands rather than
            // running away indefinitely.
            const max = revealSign * (rowWidthRef.current + revealWidth);
            if (revealSign > 0) {
                next = Math.max(0, Math.min(next, max));
            }
            else {
                next = Math.min(0, Math.max(next, max));
            }
            translateX.setValue(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
            const current = revealedRef.current ? revealSign * revealWidth + gesture.dx : gesture.dx;
            const distance = revealSign * current;
            if (distance > dismissDistance) {
                dismiss();
            }
            else if (actions && actions.length > 0 && distance > revealWidth / 2) {
                snapOpen();
            }
            else {
                snapClosed();
            }
        },
        onPanResponderTerminate: snapClosed,
    }), 
    // revealWidth/dismissDistance/actions/revealSign are stable for the
    // lifetime of a given row's props in practice; re-created only if the
    // action set itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, revealSign, revealWidth, dismissDistance]);
    const handleRowLayout = (e) => {
        rowWidthRef.current = e.nativeEvent.layout.width || DEFAULT_ROW_WIDTH;
    };
    const handlePress = () => {
        if (revealedRef.current) {
            snapClosed();
            return;
        }
        onPress?.();
    };
    const accessibilityActions = [
        ...(actions ?? []).map((a) => ({ name: a.label })),
        ...(onDismiss ? [{ name: 'dismiss' }] : []),
    ];
    const handleAccessibilityAction = (e) => {
        const name = e.nativeEvent.actionName;
        if (name === 'dismiss') {
            dismiss();
            return;
        }
        actions?.find((a) => a.label === name)?.onPress();
    };
    return (_jsxs(View, { style: styles.wrapper, testID: testID, onLayout: handleRowLayout, children: [actions && actions.length > 0 ? (_jsx(View, { style: [
                    styles.actionsLayer,
                    rtl ? { left: 0 } : { right: 0 },
                    { flexDirection: rtl ? 'row-reverse' : 'row' },
                ], children: actions.map((action) => (_jsx(Pressable, { onPress: () => {
                        action.onPress();
                        snapClosed();
                    }, accessibilityRole: "button", style: ({ pressed }) => [
                        styles.actionButton,
                        { width: ACTION_WIDTH, backgroundColor: colors.accent },
                        pressed ? styles.actionButtonPressed : null,
                    ], children: _jsx(Text, { style: [styles.actionLabel, { color: colors.onAccent }], children: action.label }) }, action.label))) })) : null, _jsx(Animated.View, { style: { transform: [{ translateX }] }, ...panResponder.panHandlers, children: _jsx(Wrapper, { style: [styles.container, { backgroundColor: colors.panel, borderColor: colors.rim }, style], children: _jsx(Pressable, { onPress: handlePress, accessibilityRole: "button", accessibilityActions: accessibilityActions, onAccessibilityAction: handleAccessibilityAction, children: _jsxs(View, { style: [styles.row, { direction: rtl ? 'rtl' : 'ltr' }], children: [icon != null ? icon : null, _jsxs(View, { style: [styles.column, { direction: 'ltr' }], children: [_jsxs(View, { style: [styles.titleRow, { flexDirection: rtl ? 'row-reverse' : 'row' }], children: [!read && unreadIndicator != null ? unreadIndicator : null, _jsx(Text, { numberOfLines: 1, style: [
                                                        styles.title,
                                                        { color: colors.text, textAlign: rtl ? 'right' : 'left', writingDirection },
                                                        titleStyle,
                                                    ], children: event.title })] }), event.body ? (_jsx(Text, { numberOfLines: 2, style: [
                                                styles.body,
                                                { color: colors.muted, textAlign: rtl ? 'right' : 'left', writingDirection },
                                                bodyStyle,
                                            ], children: event.body })) : null] }), timestamp ? (_jsx(Text, { style: [styles.timestamp, { color: colors.muted }, timestampStyle], children: timestamp })) : null] }) }) }) })] }));
}
const styles = StyleSheet.create({
    wrapper: {
    // Actions live in a layer behind the row; the row itself is the only
    // thing that ever changes this wrapper's height, so it has none of its
    // own besides what the row content drives.
    },
    actionsLayer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'stretch',
    },
    actionButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonPressed: {
        opacity: 0.85,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    container: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    column: {
        flex: 1,
    },
    titleRow: {
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        flexShrink: 1,
    },
    body: {
        fontSize: 13,
        marginTop: 2,
    },
    timestamp: {
        fontSize: 12,
    },
});
