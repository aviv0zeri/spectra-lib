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
import { ChannelRegistry } from './ChannelRegistry';
import { ExpoPushProvider } from './ExpoPushProvider';
import { ForegroundPresenter } from './ForegroundPresenter';
import { LocalNotifier } from './LocalNotifier';
import { PermissionManager } from './PermissionManager';
export class PushNotificationClient {
    constructor(options) {
        this.platform = options.platform;
        this.permissions = new PermissionManager(options.platform);
        this.provider = options.provider ?? new ExpoPushProvider(options.platform, this.permissions);
        this.channels = new ChannelRegistry(options.platform, options.categories);
        this.local = new LocalNotifier(options.platform, this.channels);
        this.foreground = new ForegroundPresenter(options.platform, options.foregroundPolicy);
        this.deepLinks = new DeepLinkRouter(options.platform, options.deepLinkResolver);
    }
    /**
     * The "turn notifications on" flow in one call: ask for permission if it
     * hasn't been asked, and if granted, obtain the token to hand to the
     * project's backend. Never throws (the token provider's contract), and
     * never re-prompts after a denial (see PermissionManager.request).
     */
    async enable() {
        const permission = await this.permissions.request();
        if (permission !== 'granted')
            return { permission, token: null };
        return { permission, token: await this.provider.register() };
    }
}
