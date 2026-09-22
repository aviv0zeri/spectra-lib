/**
 * Shared types for the push-notification interface. See README.md for scope
 * and the Apple/Google doc references these are built against.
 */

/**
 * Which provider actually issued this device's token. Left open deliberately
 * (see README.md's "provider question") -- 'expo' is what GateOpen's current
 * pushNotifications.js already gets via getExpoPushTokenAsync(); 'apns'/'fcm'
 * are the real platform tokens, for a project that goes past Expo's relay.
 */
export type PushProvider = 'expo' | 'apns' | 'fcm';

export interface PushToken {
  provider: PushProvider;
  /** The token string itself -- opaque, never parsed, only ever sent to a
   * project's own backend for storage and later use when sending. */
  value: string;
  /** When this token was obtained/refreshed -- ISO 8601. Both APNs and FCM
   * tokens can rotate; a caller storing this should overwrite, not append. */
  obtainedAt: string;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * One notification category -- e.g. "invite", "payment", "gate-activity".
 * Each maps to its own Android NotificationChannel (see channels.ts) so a
 * user can mute/configure one kind of notification without silencing all of
 * them; iOS has no channel equivalent, but a category still drives which
 * UNNotificationCategory (and therefore which interactive actions, if any)
 * a notification carries there.
 */
export interface NotificationCategory {
  /** Stable id -- becomes the Android channel id and the iOS category
   * identifier. Never rename once shipped: both platforms key existing
   * user preferences (mute state, importance overrides) off this string. */
  id: string;
  /** Shown to the user in Android's per-channel notification settings. */
  displayName: string;
  /** Android importance -- see channels.ts. No iOS equivalent (Apple has no
   * importance concept below the OS's own Focus/Do Not Disturb handling). */
  importance: 'min' | 'low' | 'default' | 'high' | 'max';
  /** Sound asset filename (with extension), or 'default', or none for a
   * silent notification. Must match an asset actually bundled via the
   * consuming project's own expo-notifications config plugin -- this type
   * doesn't (can't) validate that the file exists. */
  sound?: string;
  vibrate?: boolean;
}

/**
 * The normalized shape every handler in this tree works with, regardless of
 * whether it arrived as a remote push or was scheduled locally (see local.ts)
 * -- deliberately provider-agnostic so foreground.ts/background.ts/
 * deepLink.ts don't need to know whether expo-notifications' own event shape
 * changed underneath them.
 */
export interface NotificationEvent {
  /** Which NotificationCategory.id this belongs to. */
  categoryId: string;
  title: string;
  body: string;
  /** Arbitrary payload the sender attached -- deepLink.ts is the one place
   * that should ever interpret this project-specifically; everything else
   * here should treat it as opaque. */
  data: Record<string, unknown>;
  /** True for a silent/data-only push (APNs content-available / FCM data
   * message) with no user-visible alert -- background.ts's own concern,
   * never routed through foreground.ts's presentation logic. */
  silent: boolean;
}

/** deepLink.ts's own contract: a NotificationEvent -> where to navigate. */
export interface DeepLinkTarget {
  /** Screen/route name, in whatever shape the consuming project's own
   * navigation expects -- this tree doesn't own or assume a router. */
  screen: string;
  params?: Record<string, unknown>;
}
