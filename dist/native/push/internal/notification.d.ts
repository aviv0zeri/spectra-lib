/**
 * Shared normalization from expo-notifications' own shapes into this tree's
 * provider-agnostic NotificationEvent (see types.ts) -- used by foreground.ts,
 * background.ts and deepLink.ts so all three agree on what "silent" and
 * "categoryId" mean for the same incoming notification.
 */
import type * as Notifications from 'expo-notifications';
import type { NotificationEvent } from '../types';
export declare function toNotificationEvent(notification: Notifications.Notification): NotificationEvent;
