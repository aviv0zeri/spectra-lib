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
export declare function registerDevice(): Promise<PushToken | null>;
/**
 * No OS-side "forget this token" call exists on either platform -- the
 * actual stop-targeting call is the consuming project's own backend request
 * (the same split registerDevice()'s caller already has: this lib produces
 * the token, the project's own API call is what registers or unregisters it
 * server-side). This is a documented no-op so the interface stays symmetric
 * with registerDevice() rather than the split being implicit.
 */
export declare function unregisterDevice(_token: PushToken): Promise<void>;
/**
 * expo-notifications' addPushTokenListener fires with the raw native device
 * push token (APNs/FCM), not an Expo push token -- Expo's relay derives
 * ExponentPushToken[...] from the native token server-side, so a naive
 * implementation that wired the listener's own payload into PushToken.value
 * would hand the caller a token in the wrong format. Re-deriving via
 * registerDevice() on each native-token change is the correct fix.
 */
export declare function onTokenRefresh(handler: (token: PushToken) => void): () => void;
