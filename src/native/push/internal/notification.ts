/**
 * Shared normalization from expo-notifications' own shapes into this tree's
 * provider-agnostic NotificationEvent (see types.ts) -- used by foreground.ts,
 * background.ts and deepLink.ts so all three agree on what "silent" and
 * "categoryId" mean for the same incoming notification.
 */
import type * as Notifications from 'expo-notifications';

import type { NotificationEvent } from '../types';

/**
 * A push is "silent" (data-only, no user-visible alert) when the sender
 * marked it explicitly (`data.silent`) or the delivered content has neither
 * a title nor a body -- APNs `content-available` and FCM data messages both
 * arrive this way when they carry no `alert`/`notification` block.
 */
function isSilent(content: Notifications.NotificationContent): boolean {
  if (content.data?.silent === true) return true;
  return !content.title && !content.body;
}

/**
 * There's no cross-platform field for "which NotificationCategory is this,"
 * so this tree's own convention (documented on types.ts's NotificationEvent)
 * is that the sender includes `categoryId` in the payload's data -- the iOS
 * `categoryIdentifier` is a fallback for a push that only set that.
 */
function extractCategoryId(content: Notifications.NotificationContent): string {
  const fromData = content.data?.categoryId;
  if (typeof fromData === 'string') return fromData;
  return content.categoryIdentifier ?? '';
}

export function toNotificationEvent(notification: Notifications.Notification): NotificationEvent {
  const { content } = notification.request;
  return {
    categoryId: extractCategoryId(content),
    title: content.title ?? '',
    body: content.body ?? '',
    data: content.data ?? {},
    silent: isSilent(content),
  };
}
