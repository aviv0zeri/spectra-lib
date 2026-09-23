/**
 * Routes a tapped notification to an in-app destination. Doesn't own or
 * assume a router (React Navigation, Expo Router, a hand-rolled one -- all
 * different across Aviv's projects); its job is producing a DeepLinkTarget
 * (screen + params) from the project's own resolver, both for a cold start and
 * for a tap while the app is already running.
 *
 * The resolver lives on the instance, not in module state, so two clients (or
 * a test) never see each other's.
 */
import { toNotificationEvent } from './internal/notification';
import type { PushPlatform } from './platform';
import type { DeepLinkTarget, NotificationEvent } from './types';

/** Maps a tapped notification to where to navigate, or null for "nowhere". */
export type DeepLinkResolver = (event: NotificationEvent) => DeepLinkTarget | null;

export class DeepLinkRouter {
  private resolver: DeepLinkResolver | null;

  constructor(
    private readonly platform: PushPlatform,
    resolver: DeepLinkResolver | null = null,
  ) {
    this.resolver = resolver;
  }

  /** Registers (or replaces) the project's resolver. Call once at startup. */
  setResolver(resolver: DeepLinkResolver): void {
    this.resolver = resolver;
  }

  /**
   * Cold-start case: was this app launch caused by a notification tap? Call
   * once, early in the app's own startup sequence -- this is the path every
   * implementation of this forgets, since the live subscription (onTap) looks
   * sufficient until a cold launch silently drops the tap that caused it.
   */
  async getLaunchTarget(): Promise<DeepLinkTarget | null> {
    // With no resolver there is nowhere to route the tap, so leave it in
    // place: a caller that asks before it has registered its resolver must
    // not lose the tap that launched the app -- a later call, after
    // setResolver(), still gets it.
    if (!this.resolver) return null;
    const response = this.platform.getLastResponse();
    if (!response) return null;
    // Clear it so a later, unrelated call (e.g. a second mount during fast
    // refresh) doesn't replay the same cold-start tap.
    this.platform.clearLastResponse();
    return this.resolver(toNotificationEvent(response.notification));
  }

  /**
   * Live case: the app was already running (foreground or backgrounded, not
   * killed) when the user tapped a notification. `handler` only fires for a
   * tap the resolver maps to a target.
   */
  onTap(handler: (target: DeepLinkTarget) => void): () => void {
    return this.platform.addResponseListener((response) => {
      if (!this.resolver) return;
      const target = this.resolver(toNotificationEvent(response.notification));
      if (target) handler(target);
    });
  }
}
