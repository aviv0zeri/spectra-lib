/**
 * Silent/data-only push handling -- APNs `content-available: 1` / FCM data
 * messages with no `notification` block. These never show a user-visible
 * alert; they exist to wake the app (or, on Android, run without waking it
 * at all) to do something -- refresh cached data, update a badge count from
 * a server-authoritative value, etc.
 *
 * TODO(aviv): implement against expo-notifications' background handler
 * registration (Notifications.registerTaskAsync + expo-task-manager on the
 * native side, since JS-only background handling is not reliable once the
 * app is fully backgrounded/killed on either platform -- this is the one
 * piece of this tree that's likely to need actual native task registration,
 * not just an expo-notifications JS call).
 *
 * Design intent, not yet enforced by the stub below:
 * - iOS gives a background push a hard ~30 second budget to do work and
 *   call the completion handler; missing that budget repeatedly gets a
 *   device's background-push privilege throttled by the OS (Apple doesn't
 *   publish the exact threshold). Whatever handler this registers must
 *   resolve, not just start async work and return -- a caller's handler
 *   that fires-and-forgets a slow fetch is a bug this interface should make
 *   hard to write, not something call sites have to remember themselves.
 * - Must never be reachable for a NotificationEvent where `silent` is
 *   false -- foreground.ts/whatever handles the visible case owns those,
 *   this file owns only the invisible ones. A single incoming push should
 *   never trigger both paths.
 */

import type { NotificationEvent } from './types';

/**
 * Registers the given async handler for silent/background events. The
 * consuming project owns what the handler actually does (refetch, update a
 * local cache, ...) -- this function's only job is wiring it up correctly
 * per-platform and enforcing the completion-budget contract described above.
 */
export function setBackgroundHandler(
  _handler: (event: NotificationEvent) => Promise<void>,
): () => void {
  throw new Error('not implemented');
}
