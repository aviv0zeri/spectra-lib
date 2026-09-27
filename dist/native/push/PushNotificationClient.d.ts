/**
 * The composition root: one PushNotificationClient per app owns its
 * PermissionManager, token provider, ChannelRegistry, LocalNotifier,
 * ForegroundPresenter and DeepLinkRouter, all sharing one PushPlatform.
 *
 * Pure -- it takes a PushPlatform and imports no expo module, so it is what
 * tests construct (with FakePushPlatform). Apps use createExpoPushClient()
 * from expoPlatform.ts, which supplies the real platform.
 *
 * Constructing a client touches nothing native: no permission prompt, no
 * channel, no handler. Everything happens when a method is called, so it is
 * safe to build one at module scope.
 */
import { DeepLinkRouter } from './DeepLinkRouter';
import type { DeepLinkResolver } from './DeepLinkRouter';
import { ChannelRegistry } from './ChannelRegistry';
import type { PushTokenProvider } from './ExpoPushProvider';
import { ForegroundPresenter } from './ForegroundPresenter';
import type { ForegroundPolicy } from './ForegroundPresenter';
import { LocalNotifier } from './LocalNotifier';
import { PermissionManager } from './PermissionManager';
import type { PushPlatform } from './platform';
import type { NotificationCategory, PermissionStatus, PushToken } from './types';
export interface PushClientOptions {
    platform: PushPlatform;
    /** How this device gets a token. Defaults to Expo's push relay. */
    provider?: PushTokenProvider;
    /** The notification categories the app sends (one Android channel each). */
    categories?: readonly NotificationCategory[];
    /** How the OS presents a notification that arrives while the app is open.
     * Defaults to showing nothing (the OS default). */
    foregroundPolicy?: ForegroundPolicy;
    /** Maps a tapped notification to a screen. Can also be set later. */
    deepLinkResolver?: DeepLinkResolver;
}
export interface EnableResult {
    /** Where the permission stands after asking. */
    permission: PermissionStatus;
    /** The device token -- null unless permission was granted and the provider
     * could issue one. */
    token: PushToken | null;
}
export declare class PushNotificationClient {
    readonly platform: PushPlatform;
    readonly permissions: PermissionManager;
    readonly provider: PushTokenProvider;
    readonly channels: ChannelRegistry;
    readonly local: LocalNotifier;
    readonly foreground: ForegroundPresenter;
    readonly deepLinks: DeepLinkRouter;
    constructor(options: PushClientOptions);
    /**
     * The "turn notifications on" flow in one call: ask for permission if it
     * hasn't been asked, and if granted, obtain the token to hand to the
     * project's backend. Never throws (the token provider's contract), and
     * never re-prompts after a denial (see PermissionManager.request).
     */
    enable(): Promise<EnableResult>;
}
