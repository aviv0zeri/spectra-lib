/**
 * LOCAL notifications -- scheduled entirely on-device, no server round-trip,
 * no push token involved at all. Apple and Google both treat this as a
 * first-class, separate API from remote push (UNNotificationRequest /
 * Android's own AlarmManager-backed scheduling via NotificationManager) --
 * it belongs in this tree because it shares presentation/channel concerns
 * with remote push (same NotificationCategory, same Android channel), not
 * because it's the same delivery mechanism.
 *
 * Example use a consuming project might reach for this instead of a server
 * push: GateOpen's own "remind me before a guest arrives" -- purely
 * client-scheduled against a date the host already has locally, no reason
 * to round-trip a server for it.
 *
 * TODO(aviv): implement against expo-notifications' Notifications.
 * scheduleNotificationAsync() / cancelScheduledNotificationAsync() /
 * getAllScheduledNotificationsAsync().
 *
 * Design intent, not yet enforced by the stub below:
 * - schedule() should return an id the caller can hold onto to cancel it
 *   later (a reminder for a guest whose stay got cancelled needs to be
 *   cancelled, not just left to fire against stale data).
 * - Rescheduling (the same logical reminder, a changed trigger time)
 *   should be modeled as cancel-then-schedule by the caller, not a separate
 *   update() here -- neither platform's own scheduling API has an atomic
 *   "reschedule," so pretending this does would hide a real two-step
 *   operation behind a false one-step API.
 * - A local notification still needs a NotificationCategory (for its
 *   Android channel / iOS category) -- schedule() should reuse channels.ts's
 *   `ensureChannels` contract rather than assume the caller already set the
 *   channel up.
 */

import type { NotificationCategory } from './types';

export interface LocalNotificationRequest {
  categoryId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** When to fire -- an absolute Date, or a delay in seconds from now. */
  trigger: Date | { secondsFromNow: number };
}

/** Schedules one local notification, returning an id usable with cancel(). */
export async function schedule(
  _request: LocalNotificationRequest,
  _category: NotificationCategory,
): Promise<string> {
  throw new Error('not implemented');
}

export async function cancel(_id: string): Promise<void> {
  throw new Error('not implemented');
}

export async function cancelAll(): Promise<void> {
  throw new Error('not implemented');
}
