/**
 * Permission request/status -- iOS UNUserNotificationCenter authorization,
 * Android 13+'s runtime POST_NOTIFICATIONS permission. The platform adapter
 * already normalizes the Android <13 "never asks, reads as granted" case, so
 * nothing here branches on the OS.
 */
import type { PushPlatform } from './platform';
import type { PermissionStatus } from './types';
/** Anything the OS reports that isn't an explicit grant or denial is
 * "undetermined" -- including statuses this tree has never heard of. */
export declare function normalizeStatus(status: string): PermissionStatus;
export declare class PermissionManager {
    private readonly platform;
    private inFlight;
    constructor(platform: PushPlatform);
    getStatus(): Promise<PermissionStatus>;
    /**
     * Prompts the user if not already asked; a no-op returning the current
     * status if already resolved. iOS shows its permission dialog exactly once
     * per install -- asking again after a denial doesn't re-prompt, it just
     * silently resolves 'denied' again, so treating that as "nothing to do"
     * keeps a caller from burning that one prompt on an unrelated retry.
     *
     * Concurrent calls share one prompt: two screens asking at the same moment
     * get the same answer instead of racing two dialogs.
     */
    request(): Promise<PermissionStatus>;
    private resolve;
}
