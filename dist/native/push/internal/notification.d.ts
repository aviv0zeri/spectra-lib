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
export declare function toNotificationEvent(raw: RawNotification): NotificationEvent;
