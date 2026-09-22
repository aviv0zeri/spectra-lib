/**
 * Device token lifecycle, built on Expo's push relay (see README.md's
 * "provider question" -- this is the path GateOpen's current
 * registerForPushNotificationsAsync() already uses and proves out; moving to
 * real APNs/FCM tokens later only changes this file, not PushToken's shape).
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { getPermissionStatus } from './permissions';
import type { PushToken } from './types';

/**
 * Obtains this device's current Expo push token, or null if permission
 * isn't granted, the build has no EAS projectId (e.g. Expo Go), or
 * getExpoPushTokenAsync itself fails (simulator/emulator, offline, no push
 * capability) -- never throws, same contract as GateOpen's current
 * registerForPushNotificationsAsync(). Deliberately does NOT call
 * requestPermission() itself; a denied/undetermined status resolves to
 * null so a caller decides when the permission prompt happens.
 */
export async function registerDevice(): Promise<PushToken | null> {
  try {
    const status = await getPermissionStatus();
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!data) return null;

    return { provider: 'expo', value: data, obtainedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/**
 * No OS-side "forget this token" call exists on either platform -- the
 * actual stop-targeting call is the consuming project's own backend request
 * (the same split registerDevice()'s caller already has: this lib produces
 * the token, the project's own API call is what registers or unregisters it
 * server-side). This is a documented no-op so the interface stays symmetric
 * with registerDevice() rather than the split being implicit.
 */
export async function unregisterDevice(_token: PushToken): Promise<void> {
  return undefined;
}

/**
 * expo-notifications' addPushTokenListener fires with the raw native device
 * push token (APNs/FCM), not an Expo push token -- Expo's relay derives
 * ExponentPushToken[...] from the native token server-side, so a naive
 * implementation that wired the listener's own payload into PushToken.value
 * would hand the caller a token in the wrong format. Re-deriving via
 * registerDevice() on each native-token change is the correct fix.
 */
export function onTokenRefresh(handler: (token: PushToken) => void): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    void registerDevice().then((token) => {
      if (token) handler(token);
    });
  });
  return () => subscription.remove();
}
