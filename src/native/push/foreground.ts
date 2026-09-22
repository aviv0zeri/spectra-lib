/**
 * What happens when a notification arrives while the app is OPEN. Both
 * platforms default to showing nothing visible in this case (the user is
 * already looking at the app) unless the app opts in -- this file is where
 * that opt-in decision lives, once, instead of scattered per-screen.
 *
 * TODO(aviv): implement against expo-notifications' Notifications.
 * setNotificationHandler({ handleNotification: ... }). Nothing in GateOpen's
 * current pushNotifications.js sets this at all today -- foreground behavior
 * is whatever expo-notifications' own default is, unexamined.
 *
 * Design intent, not yet enforced by the stub below:
 * - The handler this registers must call the notifySound.js-style player
 *   for the notification's own category sound (see types.ts's
 *   NotificationCategory.sound) itself if it decides to play a sound in
 *   foreground -- setNotificationHandler's shouldPlaySound only controls the
 *   OS's own alert sound behavior for a BACKGROUNDED app; a foregrounded app
 *   showing its own in-app banner is responsible for its own sound the same
 *   way any other in-app sound effect is (see notifySound.js in the
 *   consuming project).
 * - Silent/data-only events (NotificationEvent.silent) must never reach
 *   whatever UI banner this shows -- route those to background.ts's handling
 *   instead, even if they technically arrive while foregrounded (a background
 *   fetch trigger firing while the app happens to be open is still not a
 *   user-facing alert).
 * - This should let the CALLER decide per-category whether foreground
 *   presentation happens (a chat-style project might want every message
 *   category to show something even in-app; GateOpen might want none of its
 *   categories to, since the relevant screen is presumably already visible if
 *   the app is open) -- not hardcode one global answer here.
 */

import type { NotificationEvent } from './types';

export interface ForegroundPresentation {
  /** Whether to show a visible banner/alert while the app is foregrounded.
   * iOS: maps to shouldShowBanner/shouldShowList; Android: whether the
   * notification is posted to the tray at all while the activity is
   * resumed. */
  showBanner: boolean;
  playSound: boolean;
  updateBadge: boolean;
}

/**
 * Registers the given decision function as this device's foreground
 * presentation handler -- called once per incoming event while the app is
 * open, for as long as the returned unsubscribe function isn't called.
 */
export function setForegroundHandler(
  _decide: (event: NotificationEvent) => ForegroundPresentation,
): () => void {
  throw new Error('not implemented');
}
