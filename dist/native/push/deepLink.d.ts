import type { DeepLinkTarget, NotificationEvent } from './types';
export type DeepLinkResolver = (event: NotificationEvent) => DeepLinkTarget | null;
/** Registers the project's own resolver. Call once, at app startup. */
export declare function setDeepLinkResolver(newResolver: DeepLinkResolver): void;
/**
 * Cold-start case: was this app launch caused by a notification tap? Call
 * once, early in the app's own startup sequence -- this is the path every
 * implementation of this forgets, since the live subscription below looks
 * sufficient until a cold launch silently drops the tap that caused it.
 */
export declare function getLaunchTarget(): Promise<DeepLinkTarget | null>;
/**
 * Live case: the app was already running (foreground or backgrounded, not
 * killed) when the user tapped a notification.
 */
export declare function onNotificationTapped(handler: (target: DeepLinkTarget) => void): () => void;
