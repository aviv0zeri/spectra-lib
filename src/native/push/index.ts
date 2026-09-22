/**
 * The public surface of spectra-lib's push-notification interface. See
 * README.md for scope, the Apple/Google docs this is built against, and the
 * provider question (Expo relay vs direct APNs/FCM) still left open.
 *
 * Every file behind this barrel is a scaffold as of 2026-09-22 -- types are
 * real and meant to be stable; function bodies are `TODO`-stubbed for Aviv
 * to implement (each file's own header comment has the design intent for
 * its piece). This index shouldn't need to change shape as those fill in --
 * only the internals behind each export should.
 */

export * from './types';

export { getPermissionStatus, requestPermission } from './permissions';
export { registerDevice, unregisterDevice, onTokenRefresh } from './registration';
export { ensureChannels, deleteChannel } from './channels';
export { setForegroundHandler } from './foreground';
export type { ForegroundPresentation } from './foreground';
export { setBackgroundHandler } from './background';
export { schedule, cancel, cancelAll } from './local';
export type { LocalNotificationRequest } from './local';
export { setDeepLinkResolver, getLaunchTarget, onNotificationTapped } from './deepLink';
export type { DeepLinkResolver } from './deepLink';
