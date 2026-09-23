/**
 * A transient top-of-screen alert -- matches iOS's banner (System Experiences
 * > Notifications: appears at the top of the screen for a few seconds, then
 * disappears) and Android's heads-up notification (peeks onto the current
 * screen, then returns to the shade). Presentational + gesture only: this
 * component does not position itself (no absolute/safe-area styling -- the
 * caller places it, typically as an absolute-positioned host at the app
 * root) and does not queue or unmount itself. `onDismiss` fires once the
 * exit animation finishes; removing it from state afterward is the caller's
 * job, same as `StatusBanner` never owning its own visibility.
 *
 * Swipe-to-dismiss direction follows each OS's own convention by default --
 * iOS banners are swiped up, Android heads-up notifications are swiped
 * sideways away -- via `dismissDirection` defaulting off `Platform.OS`,
 * overridable per `dismissDirection`.
 *
 * Deliberately excluded, same boundary as the rest of this package: no icon
 * library (`icon` is a caller-supplied ReactNode), no default `Container`
 * beyond a plain View, no default colors anywhere in `NotificationColors`.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { NotificationEvent } from '../push/types';
import type { NotificationAction, NotificationColors, NotificationContainerProps } from './types';

export type NotificationDismissDirection = 'up' | 'horizontal';

export interface NotificationBannerProps {
  event: NotificationEvent;
  icon?: ReactNode;
  actions?: NotificationAction[];
  colors: NotificationColors;
  rtl?: boolean;
  /** Milliseconds before this banner dismisses itself, or `false` to persist
   * until swiped/tapped away -- matches iOS's Alert style / Android's
   * ongoing notifications. Defaults to 4000ms, in line with both platforms'
   * "a few seconds" guidance for a transient banner. */
  duration?: number | false;
  /** Defaults to the OS's own convention: 'up' on iOS, 'horizontal' on
   * Android. */
  dismissDirection?: NotificationDismissDirection;
  onPress?: () => void;
  onDismiss?: () => void;
  Container?: ComponentType<NotificationContainerProps>;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  bodyStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const DISMISS_DISTANCE = 80;
const MOVE_THRESHOLD = 4;

export function NotificationBanner({
  event,
  icon,
  actions,
  colors,
  rtl = false,
  duration = 4000,
  dismissDirection,
  onPress,
  onDismiss,
  Container,
  style,
  titleStyle,
  bodyStyle,
  testID,
}: NotificationBannerProps) {
  const Wrapper: ComponentType<NotificationContainerProps> = Container ?? View;
  const direction = dismissDirection ?? (Platform.OS === 'ios' ? 'up' : 'horizontal');
  const writingDirection = rtl ? 'rtl' : 'ltr';

  const translate = useRef(new Animated.Value(direction === 'up' ? 24 : 0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const animateOut = (toValue: number) => {
    clearTimer();
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.parallel([
      Animated.timing(translate, { toValue, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss?.());
  };

  const scheduleAutoDismiss = () => {
    clearTimer();
    if (duration === false) return;
    const screenExit =
      direction === 'up' ? -Dimensions.get('window').height : Dimensions.get('window').width;
    timerRef.current = setTimeout(() => animateOut(screenExit), duration);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translate, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start(() => scheduleAutoDismiss());
    return clearTimer;
    // Entrance + auto-dismiss timer run once, off the values present at mount --
    // this component is controlled entirely by the caller mounting/unmounting it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          direction === 'up'
            ? Math.abs(gesture.dy) > MOVE_THRESHOLD
            : Math.abs(gesture.dx) > MOVE_THRESHOLD,
        onPanResponderGrant: clearTimer,
        onPanResponderMove: (_evt, gesture) => {
          if (direction === 'up') {
            // Only drag-up moves it; dragging down is clamped to 0 rather than
            // free-following, since there's no expanded state to reveal here.
            translate.setValue(Math.min(0, gesture.dy));
          } else {
            translate.setValue(gesture.dx);
          }
        },
        onPanResponderRelease: (_evt, gesture) => {
          const delta = direction === 'up' ? gesture.dy : gesture.dx;
          if (Math.abs(delta) > DISMISS_DISTANCE) {
            const screenExit =
              direction === 'up'
                ? -Dimensions.get('window').height
                : Math.sign(delta) * Dimensions.get('window').width;
            animateOut(screenExit);
          } else {
            Animated.spring(translate, { toValue: 0, useNativeDriver: true }).start();
            scheduleAutoDismiss();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translate, { toValue: 0, useNativeDriver: true }).start();
          scheduleAutoDismiss();
        },
      }),
    // direction is derived from props that don't change after mount in
    // practice (Platform.OS/dismissDirection); translate/scheduleAutoDismiss
    // are stable refs/closures over the latest `duration`/`onDismiss`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [direction],
  );

  const transform =
    direction === 'up' ? [{ translateY: translate }] : [{ translateX: translate }];

  return (
    <Animated.View
      style={[{ opacity, transform }]}
      {...panResponder.panHandlers}
      testID={testID}
    >
      <Wrapper style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.rim }, style]}>
        <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}>
          <View style={[styles.row, { direction: rtl ? 'rtl' : 'ltr' }]}>
            {icon != null ? icon : null}
            <View style={[styles.column, { direction: 'ltr' }]}>
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
          </View>
        </Pressable>
        {actions && actions.length > 0 ? (
          <View style={[styles.actionsRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.accent },
                  pressed ? styles.actionButtonPressed : null,
                ]}
              >
                <Text style={[styles.actionLabel, { color: colors.onAccent }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Wrapper>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
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
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    marginTop: 2,
  },
  actionsRow: {
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
