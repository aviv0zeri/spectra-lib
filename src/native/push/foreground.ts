/**
 * What happens when a notification arrives while the app is OPEN. Both
 * platforms default to showing nothing in this case -- this file is where a
 * project opts in, once, via a per-category decision function instead of
 * scattering the choice per screen.
 */
import * as Notifications from 'expo-notifications';

import { toNotificationEvent } from './internal/notification';
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
  decide: (event: NotificationEvent) => ForegroundPresentation,
): () => void {
  Notifications.setNotificationHandler({
    // expo-notifications gives this 3 seconds to resolve before it drops
    // the notification -- `decide` is synchronous specifically so a caller
    // can't accidentally blow that budget with an awaited call of their own.
    handleNotification: async (notification) => {
      const event = toNotificationEvent(notification);

      // Silent/data-only events are background.ts's concern even when they
      // technically arrive while foregrounded -- never let one reach the
      // caller's own presentation decision.
      if (event.silent) {
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }

      const presentation = decide(event);
      return {
        shouldShowBanner: presentation.showBanner,
        shouldShowList: presentation.showBanner,
        // Only reaches the OS's own alert-sound behavior for a backgrounded
        // app -- a genuinely foregrounded banner needs the caller's OWN
        // sound playback (its notifySound.js-style player), triggered from
        // inside `decide` itself using the event's category, since this
        // flag alone isn't guaranteed to do anything while frontmost.
        shouldPlaySound: presentation.playSound,
        shouldSetBadge: presentation.updateBadge,
      };
    },
  });

  return () => {
    Notifications.setNotificationHandler(null);
  };
}
