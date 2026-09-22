/**
 * LOCAL notifications -- scheduled entirely on-device via expo-notifications'
 * own scheduleNotificationAsync()/cancelScheduledNotificationAsync()/
 * cancelAllScheduledNotificationsAsync(), no push token or server involved.
 */
import * as Notifications from 'expo-notifications';

import { ensureChannels } from './channels';
import type { NotificationCategory } from './types';

export interface LocalNotificationRequest {
  categoryId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** When to fire -- an absolute Date, or a delay in seconds from now. */
  trigger: Date | { secondsFromNow: number };
}

function toTrigger(
  trigger: LocalNotificationRequest['trigger'],
  channelId: string,
): Notifications.NotificationTriggerInput {
  if (trigger instanceof Date) {
    return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger, channelId };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: trigger.secondsFromNow,
    channelId,
  };
}

/** NotificationCategory.sound's 'default' is a channels.ts/iOS-sound-name
 * convention this tree defines -- expo's own scheduling API instead wants a
 * bare `true` for "play the default sound." */
function contentSound(sound: string | undefined): boolean | string | undefined {
  if (sound === undefined) return undefined;
  return sound === 'default' ? true : sound;
}

/** Schedules one local notification, returning an id usable with cancel(). */
export async function schedule(
  request: LocalNotificationRequest,
  category: NotificationCategory,
): Promise<string> {
  await ensureChannels([category]);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: request.title,
      body: request.body,
      // Stamped alongside the caller's own data so a fired local notification
      // resolves through the same categoryId convention as a remote push
      // (see internal/notification.ts) -- categoryIdentifier below is only
      // the iOS fallback path.
      data: { ...request.data, categoryId: request.categoryId },
      categoryIdentifier: category.id,
      sound: contentSound(category.sound),
    },
    trigger: toTrigger(request.trigger, category.id),
  });
}

export async function cancel(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
