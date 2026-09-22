/**
 * Device token lifecycle -- obtaining, refreshing, and clearing this
 * device's push token. See README.md's "provider question" -- this file's
 * actual implementation depends on whether the consuming project stays on
 * Expo's push relay or goes to real APNs/FCM tokens; the PushToken shape in
 * types.ts is meant to survive that decision either way.
 *
 * TODO(aviv): implement. GateOpen's current registerForPushNotificationsAsync()
 * is the Expo-relay version of this exact function -- permission check,
 * Android channel bootstrap, then Notifications.getExpoPushTokenAsync().
 *
 * Design intent, not yet enforced by the stubs below:
 * - registerDevice() should call getPermissionStatus() (permissions.ts)
 *   itself rather than assume the caller already checked -- but should NOT
 *   call requestPermission(): obtaining a token without permission having
 *   been explicitly asked for by the caller's own flow is how you end up
 *   surprise-prompting a user on app launch instead of at a moment that
 *   explains why. A denied/undetermined status should resolve to `null`,
 *   never throw -- same "never throws, caller treats null as nothing to
 *   register" contract GateOpen's current version already has.
 * - Both APNs and FCM tokens can change without the app doing anything
 *   (device restore, OS reinstall, Firebase's own token rotation) -- a real
 *   implementation needs a way to hear about that (expo-notifications'
 *   addPushTokenListener, or the native token-refresh delegate callback if
 *   this ever goes past Expo's relay) and re-register, not just fetch once
 *   at login the way GateOpen's current version does.
 * - unregisterDevice() (logout) should tell the backend to stop targeting
 *   this token -- there's no local-only "unregister" on either platform,
 *   this is inherently a server call, so this function's job is producing
 *   the right token id, not depending on OS-side deregistration.
 */

import type { PushToken } from './types';

/**
 * Obtains (or reuses) this device's current push token, or null if
 * permission isn't granted, this is a device/emulator without push
 * capability, or the project has no EAS/build config to issue one against.
 * Never throws.
 */
export async function registerDevice(): Promise<PushToken | null> {
  throw new Error('not implemented');
}

/** Tells the caller's own backend this token should stop being targeted --
 * see the design intent above for why this is a backend call, not an
 * OS-side one. */
export async function unregisterDevice(_token: PushToken): Promise<void> {
  throw new Error('not implemented');
}

/**
 * Subscribes to token refresh events for as long as the returned unsubscribe
 * function isn't called -- see the design intent above on why this can't be
 * a one-shot fetch. Call the given handler with the NEW token each time it
 * changes; the caller is responsible for re-registering it with their own
 * backend.
 */
export function onTokenRefresh(_handler: (token: PushToken) => void): () => void {
  throw new Error('not implemented');
}
