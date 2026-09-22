/**
 * Routes a tapped notification (or one tapped while the app was already
 * open) to an in-app destination. The one file in this tree that's allowed
 * to interpret NotificationEvent.data project-specifically -- everywhere
 * else in this tree treats that field as opaque.
 *
 * TODO(aviv): implement. This tree doesn't own or assume a router (React
 * Navigation, Expo Router, GateOpen's own hand-rolled view-state switching
 * -- all different across Aviv's projects), so this file's job is producing
 * a DeepLinkTarget (screen + params), not performing the navigation itself.
 * The consuming project's own root component is what should call
 * getInitialNotificationResponse() on launch (cold start from a notification
 * tap) and subscribe via addNotificationResponseHandler() (tap while
 * running/backgrounded) and feed the result into ITS OWN router.
 *
 * Design intent, not yet enforced by the stub below:
 * - A project registers its own resolver -- a function from
 *   NotificationEvent to DeepLinkTarget|null -- rather than this file
 *   hardcoding any particular category-to-screen mapping (that mapping is
 *   entirely project-specific: GateOpen's "invite" category might route
 *   to a guest detail screen, a different project's might mean something
 *   else entirely for the same category name).
 * - null is a valid, expected resolver result (a notification with no
 *   sensible deep-link target, e.g. a pure informational alert) -- callers
 *   must treat it as "do nothing," not as an error.
 * - The COLD START case (app launched BY tapping a notification, not
 *   already running) is the one every implementation of this forgets: the
 *   response is available but easy to miss if a project only wires the
 *   live subscription and not the one-shot check on launch. This file's
 *   public surface should make both paths equally easy to wire, not favor
 *   the live-subscription one.
 */

import type { DeepLinkTarget, NotificationEvent } from './types';

export type DeepLinkResolver = (event: NotificationEvent) => DeepLinkTarget | null;

/** Registers the project's own resolver. Call once, at app startup. */
export function setDeepLinkResolver(_resolver: DeepLinkResolver): void {
  throw new Error('not implemented');
}

/**
 * Cold-start case: was this app launch caused by a notification tap? Call
 * once, early in the app's own startup sequence -- see the design intent
 * above on why this is easy to forget and must be exposed just as
 * prominently as the live-tap subscription below.
 */
export async function getLaunchTarget(): Promise<DeepLinkTarget | null> {
  throw new Error('not implemented');
}

/**
 * Live case: the app was already running (foreground or backgrounded, not
 * killed) when the user tapped a notification. Fires the resolver
 * registered via setDeepLinkResolver and calls the given handler with its
 * result whenever that happens, for as long as the returned unsubscribe
 * function isn't called.
 */
export function onNotificationTapped(
  _handler: (target: DeepLinkTarget) => void,
): () => void {
  throw new Error('not implemented');
}
