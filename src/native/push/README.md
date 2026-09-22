# Push notifications -- shared interface

Started 2026-09-22 as a scaffold (types + file layout + documented contracts,
mostly `TODO`-stubbed function bodies) -- Aviv is filling in the actual
implementation from here. This file is the map: what each piece owns, why it's
split the way it is, and what's deliberately OUT of scope.

## Why this belongs in spectra-lib

Every RN project of Aviv's that sends a user a push notification needs the same
client-side surface -- ask permission, register a device, decide how a
notification behaves while the app is open vs backgrounded, set up Android's
notification channels, route a tapped notification to the right screen. GateOpen
has a first cut of this today (`beta/apps/MobileApp/front/src/lib/
pushNotifications.js`, ~40 lines: permission request + Expo push token only) --
narrow, and the shape a second project would just re-copy rather than reuse,
which is exactly what [[project_spectra_rename]]'s own home, and CLAUDE.md's
"reusable components belong in spectra-lib" rule, both say not to do.

## Scope: client-side interface only

This tree is what runs ON THE DEVICE: permission, registration, channels,
foreground/background presentation, local notifications, deep-link routing.

**Explicitly NOT here:** the SERVER-SIDE code that actually calls Apple's APNs
provider API or Google's FCM HTTP v1 API to send a push. That's backend code
(Python, in GateOpen's case), lives in whichever project's own API, differs by
what triggers a send and what's in the payload per project, and this repo has no
Python tooling at all today (`tsc`-only build, see package.json). If a second
project needs the SAME send-side plumbing later, that's its own future shared
package, not this one.

## Provider question this scaffold leaves open, on purpose

GateOpen's current `pushNotifications.js` goes through **Expo's own push
service** (`Notifications.getExpoPushTokenAsync`) -- a relay Expo operates in
front of APNs/FCM, not a direct integration with either. Aviv asked for this
interface to be built "according to apple and google docs" -- which could mean
either:

1. Keep going through Expo's relay (simplest, works today, already proven in
   GateOpen), and this interface is just a cleaner/shared wrapper around the
   same `expo-notifications` calls, OR
2. Go past Expo's relay to the real APNs device token / FCM registration token
   and a project's own backend calls Apple/Google directly (more control -- rich
   payload features some Expo relay versions lag behind on, no Expo-service
   outage as a single point of failure for every project -- but real work: a
   backend APNs/FCM client per project, .p8/service-account credential
   handling, token-type bookkeeping).

Not decided here -- `types.ts`'s `PushToken` shape below supports either
(`provider: 'expo' | 'apns' | 'fcm'` on the token), so this can start on Expo's
relay (matching what already works) and move later without a breaking change to
every file that just wants "the current device token."

## Apple/Google references this scaffold is built against

- Apple: [UserNotifications framework](https://developer.apple.com/documentation/usernotifications)
  -- `UNUserNotificationCenter` (permission + delegate), `UNNotificationRequest`
  (local notifications), `UNNotificationContent` (alert/sound/badge/category),
  APNs payload keys (`aps.alert`/`aps.sound`/`aps.badge`/`aps.content-available`
  for silent push/`aps.mutable-content` for rich media/`aps.category` for
  interactive actions).
- Apple: [Push Notifications overview](https://developer.apple.com/documentation/usernotifications/setting-up-a-remote-notification-server) --
  device token lifecycle (registration, rotation, the `didFailToRegister`
  path), the distinction between a registration a `UNUserNotificationCenter`
  never resolves (denied) vs one it just hasn't asked yet.
- Google: [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) --
  notification vs data messages, Android `NotificationChannel` (importance,
  sound, vibration -- created once, immutable after that except a few fields,
  per-category channels rather than one for everything), the Android 13+
  runtime `POST_NOTIFICATIONS` permission (new; pre-13 Android never asked).
- Google: [Notification channels](https://developer.android.com/develop/ui/views/notifications/channels) --
  the specific channel-importance/behavior matrix this scaffold's `channels.ts`
  is meant to expose.
- Expo (the layer GateOpen already runs on): [expo-notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/) --
  the actual RN-callable API surface every file below will call into,
  whichever provider question above gets decided.

## File layout

```
src/native/push/
  README.md          this file
  types.ts           shared TS types -- PushToken, NotificationPayload,
                      ChannelConfig, PermissionStatus, NotificationEvent
  permissions.ts      requestPermission() / getPermissionStatus() --
                      UNUserNotificationCenter authorization (iOS) +
                      POST_NOTIFICATIONS runtime permission (Android 13+)
  registration.ts     registerDevice() / unregisterDevice() / token refresh --
                      wraps whichever provider the open question above lands on
  channels.ts         Android NotificationChannel setup -- one per
                      notification *category* (see GateOpen's future
                      categories: invites, payments, gate activity...), not
                      one channel for everything
  foreground.ts       what happens while the app is OPEN and a notification
                      arrives -- show a banner? play the sound? just update
                      badge? (`setNotificationHandler` on iOS/Android both)
  background.ts       silent/data-only push handling (`content-available: 1`
                      / FCM data message) -- background fetch/sync triggers,
                      no user-visible alert
  local.ts            scheduled LOCAL notifications (no server round-trip at
                      all) -- Apple/Google both have a first-class API for
                      this, distinct from remote push; e.g. GateOpen's own
                      "reminder before a guest arrives" is this, not a push
  deepLink.ts         routes a tapped notification's data payload to an
                      in-app destination (screen + params)
  index.ts            the public surface -- what `spectra-lib/native/push`
                      actually exports; everything above is an implementation
                      detail behind this barrel
```

## Wiring into a consuming project (once this is real)

Same pattern as `spectra-lib/native`'s existing StatusScreen/StatusBanner
(`src/native/index.tsx`, on branch `feat/native-status-components`, not yet on
main): a project imports from `spectra-lib/native/push` (or folds into the
same `spectra-lib/native` entry, whichever `package.json`'s `exports` map ends
up doing), pinned to a tagged spectra-lib version the same way GateOpen already
pins spectra-lib for everything else. GateOpen's own
`beta/apps/MobileApp/front/src/lib/pushNotifications.js` is the thing this is
meant to eventually replace -- migrating it over is real follow-up work once
this lands, not implied by scaffolding it.
