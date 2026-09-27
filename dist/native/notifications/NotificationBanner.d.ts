import type { ComponentType, ReactNode } from 'react';
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
export declare function NotificationBanner({ event, icon, actions, colors, rtl, duration, dismissDirection, onPress, onDismiss, Container, style, titleStyle, bodyStyle, testID, }: NotificationBannerProps): import("react").JSX.Element;
