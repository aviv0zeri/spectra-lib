/**
 * The public surface of spectra-lib's push-notification interface. See
 * README.md for scope, the class map and the Apple/Google docs this is built
 * against.
 *
 * Object-oriented since v0.30.0: a PushNotificationClient composes small
 * single-purpose classes over one narrow PushPlatform seam. Apps build the
 * client with createExpoPushClient(); tests build it with a FakePushPlatform
 * (spectra-lib/native/push/testing).
 *
 * setBackgroundHandler is NOT re-exported here -- import it from
 * spectra-lib/native/push/background. expo-task-manager requires defineTask()
 * to run at the module scope of an early-loaded file, so background.ts calls
 * it unconditionally on import, which would make expo-task-manager a hard
 * requirement of merely importing this barrel. A consumer that only wants
 * permissions/registration/channels/foreground shouldn't need it installed.
 */

export * from './types';

export type {
  ChannelImportance,
  PlatformChannelConfig,
  PlatformForegroundHandler,
  PlatformScheduleRequest,
  PlatformTrigger,
  PushPlatform,
  RawNotification,
  RawNotificationResponse,
} from './platform';

export { PermissionManager, normalizeStatus } from './PermissionManager';
export { ExpoPushProvider } from './ExpoPushProvider';
export type { ExpoPushProviderOptions, PushTokenProvider } from './ExpoPushProvider';
export { ChannelRegistry, androidSoundName } from './ChannelRegistry';
export { LocalNotifier } from './LocalNotifier';
export type { LocalNotificationRequest } from './LocalNotifier';
export { ForegroundPresenter, SUPPRESS_ALL } from './ForegroundPresenter';
export type { ForegroundListener, ForegroundPolicy } from './ForegroundPresenter';
export { DeepLinkRouter } from './DeepLinkRouter';
export type { DeepLinkResolver } from './DeepLinkRouter';
export { PushNotificationClient } from './PushNotificationClient';
export type { EnableResult, PushClientOptions } from './PushNotificationClient';
export { createExpoPlatform, createExpoPushClient } from './expoPlatform';
