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
export { setBackgroundHandler } from './background';
export { schedule, cancel, cancelAll } from './local';
export { setDeepLinkResolver, getLaunchTarget, onNotificationTapped } from './deepLink';
