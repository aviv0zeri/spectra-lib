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
import type { ComponentType, ReactNode } from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LayoutChangeEvent, StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { NotificationEvent } from '../push/types';
import type { NotificationAction, NotificationColors, NotificationContainerProps } from './types';

export interface NotificationRowProps {
  /** Stable id -- not read by this component, but required so a caller
   * rendering a list of these has a natural `key`. */
  id: string;
  event: NotificationEvent;
  /** Pre-formatted display string (e.g. "2m ago", "10:32"); this package
   * doesn't own date formatting/locale, same as `title`/`message` elsewhere
   * being final display strings, not raw data. */
  timestamp?: string;
  icon?: ReactNode;
  /** Caller-supplied unread marker (a dot, a bold-dot badge, ...), shown
   * when `read` is false. */
  unreadIndicator?: ReactNode;
  read?: boolean;
  /** Revealed on a partial swipe toward the reading-end edge. */
  actions?: NotificationAction[];
  colors: NotificationColors;
  rtl?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
  Container?: ComponentType<NotificationContainerProps>;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  bodyStyle?: StyleProp<TextStyle>;
  timestampStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const ACTION_WIDTH = 76;
const MOVE_THRESHOLD = 4;
const DEFAULT_ROW_WIDTH = 320;
const DISMISS_MARGIN = 40;

export function NotificationRow({
  id: _id,
  event,
  timestamp,
  icon,
  unreadIndicator,
  read = true,
  actions,
  colors,
  rtl = false,
  onPress,
  onDismiss,
  Container,
  style,
  titleStyle,
  bodyStyle,
  timestampStyle,
  testID,
}: NotificationRowProps) {
  const Wrapper: ComponentType<NotificationContainerProps> = Container ?? View;
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

  const setRevealedState = (value: boolean) => {
    revealedRef.current = value;
    setRevealed(value);
  };

  const animateTo = (toValue: number, onEnd?: () => void) => {
    Animated.spring(translateX, { toValue, useNativeDriver: true, bounciness: 4 }).start(onEnd);
  };

  const snapClosed = () => {
    setRevealedState(false);
    animateTo(0);
  };

  const snapOpen = () => {
    if (!actions || actions.length === 0) return;
    setRevealedState(true);
    animateTo(revealSign * revealWidth);
  };

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    const exitTo = revealSign * (rowWidthRef.current + revealWidth + DISMISS_MARGIN);
    Animated.timing(translateX, { toValue: exitTo, duration: 180, useNativeDriver: true }).start(
      () => onDismiss?.(),
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
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
          } else {
            next = Math.min(0, Math.max(next, max));
          }
          translateX.setValue(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const current = revealedRef.current ? revealSign * revealWidth + gesture.dx : gesture.dx;
          const distance = revealSign * current;
          if (distance > dismissDistance) {
            dismiss();
          } else if (actions && actions.length > 0 && distance > revealWidth / 2) {
            snapOpen();
          } else {
            snapClosed();
          }
        },
        onPanResponderTerminate: snapClosed,
      }),
    // revealWidth/dismissDistance/actions/revealSign are stable for the
    // lifetime of a given row's props in practice; re-created only if the
    // action set itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, revealSign, revealWidth, dismissDistance],
  );

  const handleRowLayout = (e: LayoutChangeEvent) => {
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
    ...(onDismiss ? [{ name: 'dismiss' as const }] : []),
  ];

  const handleAccessibilityAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'dismiss') {
      dismiss();
      return;
    }
    actions?.find((a) => a.label === name)?.onPress();
  };

  return (
    <View style={styles.wrapper} testID={testID} onLayout={handleRowLayout}>
      {actions && actions.length > 0 ? (
        <View
          style={[
            styles.actionsLayer,
            rtl ? { left: 0 } : { right: 0 },
            { flexDirection: rtl ? 'row-reverse' : 'row' },
          ]}
        >
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                action.onPress();
                snapClosed();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.actionButton,
                { width: ACTION_WIDTH, backgroundColor: colors.accent },
                pressed ? styles.actionButtonPressed : null,
              ]}
            >
              <Text style={[styles.actionLabel, { color: colors.onAccent }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Wrapper style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.rim }, style]}>
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityActions={accessibilityActions}
            onAccessibilityAction={handleAccessibilityAction}
          >
            <View style={[styles.row, { direction: rtl ? 'rtl' : 'ltr' }]}>
              {icon != null ? icon : null}
              <View style={[styles.column, { direction: 'ltr' }]}>
                <View style={[styles.titleRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                  {!read && unreadIndicator != null ? unreadIndicator : null}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.title,
                      { color: colors.text, textAlign: rtl ? 'right' : 'left', writingDirection },
                      titleStyle,
                    ]}
                  >
                    {event.title}
                  </Text>
                </View>
                {event.body ? (
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.body,
                      { color: colors.muted, textAlign: rtl ? 'right' : 'left', writingDirection },
                      bodyStyle,
                    ]}
                  >
                    {event.body}
                  </Text>
                ) : null}
              </View>
              {timestamp ? (
                <Text style={[styles.timestamp, { color: colors.muted }, timestampStyle]}>
                  {timestamp}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Wrapper>
      </Animated.View>
    </View>
  );
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
