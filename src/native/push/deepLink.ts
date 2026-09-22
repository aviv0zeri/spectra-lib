/**
 * Routes a tapped notification to an in-app destination. Doesn't own or
 * assume a router (React Navigation, Expo Router, a hand-rolled one -- all
 * different across Aviv's projects); this file's job is producing a
 * DeepLinkTarget (screen + params) from the project's own registered
 * resolver, both for a cold start and for a tap while already running.
 */
import * as Notifications from 'expo-notifications';

import { toNotificationEvent } from './internal/notification';
import type { DeepLinkTarget, NotificationEvent } from './types';

export type DeepLinkResolver = (event: NotificationEvent) => DeepLinkTarget | null;

let resolver: DeepLinkResolver | null = null;

/** Registers the project's own resolver. Call once, at app startup. */
export function setDeepLinkResolver(newResolver: DeepLinkResolver): void {
  resolver = newResolver;
}

/**
 * Cold-start case: was this app launch caused by a notification tap? Call
 * once, early in the app's own startup sequence -- this is the path every
 * implementation of this forgets, since the live subscription below looks
 * sufficient until a cold launch silently drops the tap that caused it.
 */
export async function getLaunchTarget(): Promise<DeepLinkTarget | null> {
  const response = Notifications.getLastNotificationResponse();
  if (!response) return null;
  // Clear it so a later, unrelated getLaunchTarget() call (e.g. a second
  // mount during fast refresh) doesn't replay the same cold-start tap.
  Notifications.clearLastNotificationResponse();
  if (!resolver) return null;
  return resolver(toNotificationEvent(response.notification));
}

/**
 * Live case: the app was already running (foreground or backgrounded, not
 * killed) when the user tapped a notification.
 */
export function onNotificationTapped(handler: (target: DeepLinkTarget) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (!resolver) return;
    const target = resolver(toNotificationEvent(response.notification));
    if (target) handler(target);
  });
  return () => subscription.remove();
}
