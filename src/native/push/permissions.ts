/**
 * Permission request/status -- iOS UNUserNotificationCenter authorization,
 * Android 13+'s runtime POST_NOTIFICATIONS permission (pre-13 Android never
 * asks; a permission check there should read as already-granted).
 *
 * TODO(aviv): implement against expo-notifications' Notifications.
 * getPermissionsAsync()/requestPermissionsAsync() -- see GateOpen's current
 * registerForPushNotificationsAsync() (beta/apps/MobileApp/front/src/lib/
 * pushNotifications.js) for the exact calls this should generalize.
 *
 * Design intent, not yet enforced by the stub below:
 * - getPermissionStatus() must NEVER itself trigger the OS permission
 *   prompt -- only requestPermission() may. A caller checking status on
 *   screen mount, before the user has done anything, must not accidentally
 *   burn the one iOS prompt a user ever sees before "denied" becomes
 *   permanent (Apple only shows the system dialog once; after a denial the
 *   only way back is Settings).
 * - requestPermission() should be a no-op (return the current status
 *   immediately) if already granted OR already denied -- re-asking a denied
 *   user does nothing on iOS but silently succeeds as a no-op call, and
 *   should read that way here rather than as a fresh prompt.
 */

import type { PermissionStatus } from './types';

export async function getPermissionStatus(): Promise<PermissionStatus> {
  throw new Error('not implemented');
}

/**
 * Prompts the user if not already asked; a no-op returning the current
 * status if already resolved (granted or denied) -- see the design intent
 * above for why re-prompting a denial must not happen from here.
 */
export async function requestPermission(): Promise<PermissionStatus> {
  throw new Error('not implemented');
}
