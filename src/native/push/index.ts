/**
 * The public surface of spectra-lib's push-notification interface. See
 * README.md for scope and the Apple/Google docs this is built against.
 *
 * Implemented as of 2026-09-22 against Expo's own push relay (getExpoPushTokenAsync)
 * rather than direct APNs/FCM tokens -- README.md's "provider question,"
 * resolved in favor of the path GateOpen's current pushNotifications.js
 * already proves out; PushToken.provider still supports 'apns'/'fcm' if a
 * project ever needs to move past the relay without a breaking change here.
 */

export * from './types';

export { getPermissionStatus, requestPermission } from './permissions';
export { registerDevice, unregisterDevice, onTokenRefresh } from './registration';
export { ensureChannels, deleteChannel } from './channels';
export { setForegroundHandler } from './foreground';
export type { ForegroundPresentation } from './foreground';
// setBackgroundHandler is NOT re-exported here -- import it from
// './background' directly (spectra-lib/native/push/background). Its own
// doc comment explains why: expo-task-manager requires defineTask() to run
// at the module scope of an early-loaded file, so background.ts calls it
// unconditionally on import, which makes expo-task-manager resolvable a
// hard requirement of merely importing this file -- not just of calling
// setBackgroundHandler. A consumer that only wants permissions/registration/
// channels/foreground (GateOpen, today) shouldn't need expo-task-manager
// installed at all just to import this barrel; one that also wants
// background/silent-push handling imports the background subpath too.
export { schedule, cancel, cancelAll } from './local';
export type { LocalNotificationRequest } from './local';
export { setDeepLinkResolver, getLaunchTarget, onNotificationTapped } from './deepLink';
export type { DeepLinkResolver } from './deepLink';
