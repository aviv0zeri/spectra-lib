/**
 * Shared normalization from the platform's RawNotification into this tree's
 * provider-agnostic NotificationEvent (see types.ts) -- used by
 * ForegroundPresenter, DeepLinkRouter and background.ts so all three agree on
 * what "silent" and "categoryId" mean for the same incoming notification.
 *
 * Pure: no expo import, so it is unit-tested directly.
 */
import type { RawNotification } from '../platform';
import type { NotificationEvent } from '../types';

/**
 * A push is "silent" (data-only, no user-visible alert) when the sender
 * marked it explicitly (`data.silent`) or the delivered content has neither
 * a title nor a body -- APNs `content-available` and FCM data messages both
 * arrive this way when they carry no `alert`/`notification` block.
 */
function isSilent(raw: RawNotification): boolean {
  if (raw.data?.silent === true) return true;
  return !raw.title && !raw.body;
}

/**
 * There's no cross-platform field for "which NotificationCategory is this,"
 * so this tree's own convention (documented on types.ts's NotificationEvent)
 * is that the sender includes `categoryId` in the payload's data -- the iOS
 * `categoryIdentifier` is a fallback for a push that only set that.
 */
function extractCategoryId(raw: RawNotification): string {
  const fromData = raw.data?.categoryId;
  if (typeof fromData === 'string') return fromData;
  return raw.categoryIdentifier ?? '';
}

export function toNotificationEvent(raw: RawNotification): NotificationEvent {
  return {
    categoryId: extractCategoryId(raw),
    title: raw.title ?? '',
    body: raw.body ?? '',
    data: raw.data ?? {},
    silent: isSilent(raw),
  };
}
