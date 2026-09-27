import type { PushPlatform } from './platform';
import type { DeepLinkTarget, NotificationEvent } from './types';
/** Maps a tapped notification to where to navigate, or null for "nowhere". */
export type DeepLinkResolver = (event: NotificationEvent) => DeepLinkTarget | null;
export declare class DeepLinkRouter {
    private readonly platform;
    private resolver;
    constructor(platform: PushPlatform, resolver?: DeepLinkResolver | null);
    /** Registers (or replaces) the project's resolver. Call once at startup. */
    setResolver(resolver: DeepLinkResolver): void;
    /**
     * Cold-start case: was this app launch caused by a notification tap? Call
     * once, early in the app's own startup sequence -- this is the path every
     * implementation of this forgets, since the live subscription (onTap) looks
     * sufficient until a cold launch silently drops the tap that caused it.
     */
    getLaunchTarget(): Promise<DeepLinkTarget | null>;
    /**
     * Live case: the app was already running (foreground or backgrounded, not
     * killed) when the user tapped a notification. `handler` only fires for a
     * tap the resolver maps to a target.
     */
    onTap(handler: (target: DeepLinkTarget) => void): () => void;
}
