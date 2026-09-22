/**
 * Android NotificationChannel management, one channel per NotificationCategory
 * (see types.ts) so a user can mute/configure "gate activity" without also
 * muting "payment failed." No-op on iOS at every export -- callers shouldn't
 * need a Platform.OS branch at the call site.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationCategory } from './types';

const IMPORTANCE: Record<NotificationCategory['importance'], Notifications.AndroidImportance> = {
  min: Notifications.AndroidImportance.MIN,
  low: Notifications.AndroidImportance.LOW,
  default: Notifications.AndroidImportance.DEFAULT,
  high: Notifications.AndroidImportance.HIGH,
  max: Notifications.AndroidImportance.MAX,
};

/**
 * NotificationCategory.sound is documented (types.ts) as a filename WITH
 * extension, matching iOS's convention -- but Android's channel `sound`
 * field wants the raw resource name with no extension. Stripping it here
 * keeps that one field usable as-is from both channels.ts and local.ts
 * without pushing the platform difference onto every caller.
 */
function androidSoundName(sound: string | undefined): string | null | undefined {
  if (!sound || sound === 'default') return sound ?? undefined;
  return sound.replace(/\.[^/.]+$/, '');
}

/** Creates (or updates the mutable fields of) one Android channel per given
 * category. No-op entirely on iOS. */
export async function ensureChannels(categories: NotificationCategory[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    categories.map((category) =>
      Notifications.setNotificationChannelAsync(category.id, {
        name: category.displayName,
        importance: IMPORTANCE[category.importance],
        sound: androidSoundName(category.sound),
        enableVibrate: category.vibrate,
      }),
    ),
  );
}

/** Deletes a channel by category id -- e.g. a category the app no longer
 * sends. No-op on iOS. Does not affect notifications already delivered
 * under that channel. */
export async function deleteChannel(categoryId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.deleteNotificationChannelAsync(categoryId);
}
