import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
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
export declare function NotificationRow({ id: _id, event, timestamp, icon, unreadIndicator, read, actions, colors, rtl, onPress, onDismiss, Container, style, titleStyle, bodyStyle, timestampStyle, testID, }: NotificationRowProps): import("react").JSX.Element;
