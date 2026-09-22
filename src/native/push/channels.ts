/**
 * Android NotificationChannel management. iOS has nothing to do here --
 * every function below should be a no-op on iOS, not an error, so a
 * consuming project can call ensureChannels() unconditionally at startup
 * without a Platform.OS branch at every call site.
 *
 * TODO(aviv): implement against expo-notifications' Notifications.
 * setNotificationChannelAsync(). GateOpen's current
 * registerForPushNotificationsAsync() creates exactly one channel ('default')
 * -- this should generalize to one channel PER NotificationCategory (see
 * types.ts), so a user can mute/configure "gate activity" notifications
 * without also muting "payment failed" ones.
 *
 * Design intent, not yet enforced by the stub below:
 * - A channel, once created, is immutable on the OS side except for a few
 *   fields (name, description, importance can be lowered by the user but
 *   never raised back by the app) -- calling setNotificationChannelAsync
 *   again with the same id is how you update what CAN be updated; it will
 *   NOT retroactively change sound/vibration for a channel the user has
 *   already seen, by Android design (the OS treats channel identity as the
 *   user's own settings surface, not the app's to keep overriding). A real
 *   implementation that needs to change a channel's sound must create a NEW
 *   channel id, not just call this again with new settings and expect the
 *   old channel to pick it up.
 * - ensureChannels() should be idempotent and cheap enough to call on every
 *   app launch (Android's own API already is; ExpoNotifications wraps it
 *   1:1) -- callers shouldn't need to reason about "have I already created
 *   these."
 */

import type { NotificationCategory } from './types';

/** Creates (or no-ops if already current) one Android channel per given
 * category. No-op entirely on iOS. */
export async function ensureChannels(_categories: NotificationCategory[]): Promise<void> {
  throw new Error('not implemented');
}

/** Deletes a channel by category id -- e.g. a category the app no longer
 * sends. No-op on iOS. Does not affect notifications already delivered
 * under that channel. */
export async function deleteChannel(_categoryId: string): Promise<void> {
  throw new Error('not implemented');
}
