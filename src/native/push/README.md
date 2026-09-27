# Push notifications -- shared interface

Started 2026-09-22 as a scaffold and implemented the same day as module-level
functions; rewritten in v0.30.0 as small classes over one injected platform seam
(see "Class map" below). This file is the map: what each piece owns, why it's
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

## Provider question -- resolved 2026-09-22, in favor of Expo's relay

GateOpen's current `pushNotifications.js` goes through **Expo's own push
service** (`Notifications.getExpoPushTokenAsync`) -- a relay Expo operates in
front of APNs/FCM, not a direct integration with either. This scaffold's own
README originally left open whether to keep going through that relay or go
past it to real APNs/FCM tokens (a project's own backend calling Apple/Google
directly -- more control, no Expo-service single point of failure, but real
work: a backend APNs/FCM client per project, .p8/service-account credential
handling, token-type bookkeeping).

Implemented against option 1, Expo's relay: it's what GateOpen already proves
out today, and the platform adapter (`expoPlatform.ts`) is a thin wrapper around the
matching `expo-notifications` calls, and `ExpoPushProvider` is the only class
that knows about Expo's relay. `types.ts`'s
`PushToken.provider: 'expo' | 'apns' | 'fcm'` still supports moving to a
direct integration later without a breaking change to any file that just
wants "the current device token" -- that migration is real, un-started
follow-up work, not implied by this implementation.

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
  the specific channel-importance/behavior matrix `ChannelRegistry` exposes.
- Expo (the layer GateOpen already runs on): [expo-notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/) --
  the actual RN-callable API surface the adapter (`expoPlatform.ts`) calls into,
  whichever provider question above gets decided.

## Class map

One `PushNotificationClient` per app composes single-purpose classes that all
talk to the OS through ONE injected seam, `PushPlatform`. That seam is what
makes the classes unit-testable without a device (`FakePushPlatform`, exported
as `spectra-lib/native/push/testing`) and what would let a project swap the
delivery stack without touching a caller.

```
src/native/push/
  README.md               this file
  types.ts                PushToken, PermissionStatus, NotificationCategory,
                          NotificationEvent, ForegroundPresentation,
                          UnknownCategoryError
  platform.ts             PushPlatform -- the narrow, expo-free seam every
                          class below talks to (+ RawNotification etc.)
  expoPlatform.ts         createExpoPlatform() / createExpoPushClient() -- the
                          real PushPlatform. The ONLY file (besides
                          background.ts) importing expo-notifications.
  testing.ts              FakePushPlatform -- in-memory, for tests
                          (subpath: spectra-lib/native/push/testing)

  PushNotificationClient  the facade / composition root: owns one of each
                          class below; enable() = ask permission, then token
  PermissionManager       getStatus() / request() -- never re-prompts after a
                          denial; concurrent request() calls share one prompt
  ExpoPushProvider        PushTokenProvider strategy for Expo's relay:
                          register() / unregister() / onRefresh(). Another
                          provider (raw APNs/FCM) implements the same interface
  ChannelRegistry         the app's NotificationCategory set + Android
                          channels (one per category); iOS: every OS call is a
                          no-op. Also the id -> category lookup for scheduling
  LocalNotifier           schedule() / cancel() / cancelAll() -- on-device, no
                          server; takes a category id, asks the registry
  ForegroundPresenter     while the app is OPEN: a synchronous
                          ForegroundPolicy decides OS presentation, and
                          subscribe() tells the app "this arrived" (how an
                          in-app banner learns of it); start()/stop()
  DeepLinkRouter          cold-start tap (getLaunchTarget) + live tap (onTap)
                          -> DeepLinkTarget, via the project's own resolver
  internal/notification   pure RawNotification -> NotificationEvent (what
                          "silent" and "categoryId" mean)

  background.ts       silent/data-only push handling (`content-available: 1`
                      / FCM data message) -- background fetch/sync triggers,
                      no user-visible alert. NOT re-exported from index.ts --
                      its own `setBackgroundHandler` is imported from
                      `spectra-lib/native/push/background`, its own subpath.
                      expo-task-manager requires defineTask() to run at the
                      module scope of an early-loaded file, so this file
                      calls it unconditionally on import -- folding it into
                      the main barrel would make expo-task-manager
                      resolvable a hard requirement of importing
                      `spectra-lib/native/push` AT ALL, for every consumer,
                      even one that only wants permissions/registration/
                      channels/foreground and never touches background push
                      (GateOpen, today). What actually happened: with this
                      file in the barrel, GateOpen crashed at boot ("Cannot
                      find native module 'ExpoTaskManager'") on any binary
                      that didn't have expo-task-manager's native module
                      compiled in -- an older install running a build that
                      predates the dependency, which is exactly what a
                      JS-only OTA update reaches. Importing the barrel
                      evaluated this file, which requires that native
                      module at import time. (An earlier version of this
                      note blamed New Architecture module resolution; that
                      was never established -- it came from misreading a
                      stale install as the freshly built one.)
  index.ts                the public surface of `spectra-lib/native/push`
```

Constructing a client touches nothing native (no prompt, no channel, no
handler), so it is safe to build at module scope; everything happens when a
method is called.

### The visual half

`spectra-lib/native` (not this subpath) holds the components that draw
notifications -- `NotificationBanner` (transient), `NotificationRow` (history
list) -- and `PushTester`, a screen body for exercising the whole path end to
end. `PushTester` follows the package's boundary rule (caller-supplied colors,
labels, icons; no defaults) and is a thin view over `PushTesterController`, a
plain class that holds the logic and is unit-tested against a fake client. It
depends only on a structural `PushTesterClient`, so `spectra-lib/native` pulls
in no push runtime.

## Using it

```ts
import { createExpoPushClient } from 'spectra-lib/native/push';

export const push = createExpoPushClient({
  categories: [{ id: 'default', displayName: 'Default', importance: 'default',
                 sound: 'push_notify.wav' }],
  foregroundPolicy: () => ({ showBanner: false, playSound: true, updateBadge: true }),
});

// once the user is signed in:
const { token } = await push.enable();          // asks permission, then token

// in a root component's effect:
await push.channels.sync();                     // Android channels
const off = push.foreground.subscribe(showInAppBanner); // starts the presenter
```

`subscribe()` starts the foreground presenter, and the last unsubscribe stops it
again. Call `push.foreground.start()` yourself only to apply the policy with no
subscribers; that one keeps running until `stop()`.

**One client per app.** The OS has a single foreground handler and a single tap
stream, so build one `PushNotificationClient` (a module-level constant is
right). A second client that starts its presenter replaces the first one's
handler.

### What a remote sender must include

The classes decode incoming notifications by a small convention; a backend that
sends pushes needs to follow it, and nothing in the client can enforce it:

- `data.categoryId` -- the `NotificationCategory.id` this notification belongs
  to. Without it the event's `categoryId` falls back to the iOS
  `categoryIdentifier`, else `''`, which no resolver or policy will match.
- Android `channelId` -- must equal that category id, and the channel must exist
  on the device: `push.channels.sync()` (or a scheduled local notification for
  the category) creates it. A push for a channel that was never created is not
  shown on Android.
- A silent (data-only) push has no title and no body, or `data.silent: true`; it
  is routed to `background.ts`, never to the foreground presenter.

### Swapping the delivery stack

`PushTokenProvider` is the strategy for "how does this device get a token", and
`PushPlatform` is the seam under it. The seam today exposes the Expo-relay calls
(`getProjectId`, `getExpoPushToken`) because that is the only stack implemented.
A raw APNs/FCM provider would add a native-token accessor to `PushPlatform`
(and `addPushTokenListener` would need to pass the token through, it is
payload-less now) -- a small, additive change to the seam, not a rewrite of the
callers. It has not been built.

A notification sound file becomes an Android resource, so its name must be
lowercase `a-z`, `0-9` and `_` only (`push-notify.wav` fails Android's prebuild;
`push_notify.wav` is fine).

In tests, build the same client on `FakePushPlatform` instead:

```ts
import { PushNotificationClient } from 'spectra-lib/native/push';
import { FakePushPlatform } from 'spectra-lib/native/push/testing';
```

## Wiring into a consuming project

A project imports from `spectra-lib/native/push`, pinned to a tagged
spectra-lib version the same way it pins the rest of the package. GateOpen
(`beta/apps/MobileApp/front`) builds its client once in `src/lib/pushClient.js`
and its tester screen is a thin wrapper over `PushTester`.
