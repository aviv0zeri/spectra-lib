# Notifications -- visual components

`../push` builds the OS plumbing (permission, registration, channels,
foreground/background presentation, deep-linking) -- everything that decides
*whether* the OS shows something. Nothing in that tree renders a pixel. This
folder is the part Apple's Human Interface Guidelines (System Experiences >
Notifications, Managing Notifications) and Android's notification design
guidance (developer.android.com's notification patterns, Material Design's
notification cards) actually govern: what a notification *looks like* and how
a person interacts with it once it's on screen.

## Two shapes, matching each OS's own split

- **`NotificationBanner`** -- transient, top-of-screen. Matches iOS's banner
  ("appears at the top of the screen for a few seconds, then disappears") and
  Android's heads-up notification (peeks onto the current screen, then
  returns to the shade).
- **`NotificationRow`** -- persistent, one item in a list/history. Matches
  iOS's Notification Center row and Android's notification-shade card.

Both consume `NotificationEvent` from `../push/types` as-is -- this folder
doesn't redefine or extend that shape. `NotificationRow` additionally takes
`id`/`timestamp` as sibling props (a stable list key and a pre-formatted
display string), since those are UI-history concerns the OS-facing
`NotificationEvent` never carried in the first place.

## Interaction decisions grounded in each platform's actual docs

- **Auto-dismiss / swipe-to-dismiss direction (banner):** iOS banners are
  swiped *up* to dismiss; Android heads-up notifications are swiped
  *sideways* away (and suppress further heads-up peeks for a minute after).
  `dismissDirection` defaults off `Platform.OS` to match each OS's own
  gesture rather than picking one and forcing it everywhere.
- **Swipe-reveal then swipe-through (row):** iOS's Notification Center swipes
  *left* to reveal Clear/Options; Android's shade cards swipe away directly,
  with no revealed row. `NotificationRow` unifies these into one coherent
  gesture rather than forking behavior per OS: a partial swipe toward the
  reading-end edge reveals `actions` (iOS's affordance), continuing past a
  further threshold dismisses outright (Android's), and with no `actions`
  supplied any swipe past the threshold dismisses directly. This is also the
  standard "swipeable row" pattern most RN apps already use for any
  dismissible list, not just notifications.
- **No gesture library dependency.** Neither `react-native-gesture-handler`
  nor `react-native-reanimated` is a dependency anywhere in this repo or in
  GateOpen; both components build their drag/dismiss interaction on core
  `PanResponder` + `Animated`, the same primitives `CalendarGrid` already
  uses, rather than introducing a new dependency for this.
- **Accessibility parity for gesture-only actions.** A swipe gesture is
  invisible to a screen reader. `NotificationRow` also exposes its `actions`
  (plus dismiss) via `accessibilityActions`/`onAccessibilityAction`, so
  VoiceOver/TalkBack users reach the same functionality without performing a
  drag.
- **Not attempted:** iOS's swipe-down-to-expand / long-press interaction
  state (revealing up to 4 inline actions on an otherwise-collapsed banner).
  That's a genuine additional interaction *mode*, not a variant of
  dismiss-swiping, and a reasonable follow-up rather than something a first
  general version needs to block on. `NotificationBanner.actions`, when
  supplied, renders as an always-visible row instead of a gesture-gated
  expand -- a simpler stand-in that still covers Android's inline collapsed
  actions (up to 3, per its own guidance) without the extra state machine.

## Boundary discipline (same as the rest of `spectra-lib/native`)

No icon library (`icon` is a caller-supplied `ReactNode`, same slot
`StatusScreen`/`StatusBanner` use), no default `Container` beyond a plain
`View`, no default colors anywhere in `NotificationColors` -- the caller's
theme is the only source. This package doesn't format dates/times either;
`NotificationRow.timestamp` is a plain display string the caller already
formatted for their own locale.

## `PushTester` -- exercising the whole path

A screen body for testing a project's push setup end to end: permission state,
a title/body form, a real LOCAL notification fired 2 or 10 seconds out (it takes
exactly the path a remote push takes once on the device, and it's the only way
to exercise that on an iOS Simulator), a list of what was sent with a "reuse"
action, and this device's push token.

```tsx
<PushTester
  client={push}                 // a PushNotificationClient (or any PushTesterClient)
  categoryId="default"          // a category registered with the client
  defaultTitle="Test" defaultBody="Hello"
  labels={labels}               // every word -- see PushTesterLabels
  colors={notificationColors}   // same NotificationColors as the banner/row
  icons={{ permissionGranted, permissionMissing, notification }}
  rtl={layoutRTL}
/>
```

Same boundary as the rest: no default colors, strings or icons, and no screen
chrome (title bar, back button) -- the caller wraps it. `scheduled` and `tapped`
labels carry `{n}` / `{title}` placeholders the tester fills in.

The logic is `PushTesterController`, a plain class (state + actions, no React, no
strings -- statuses are data the view words with the caller's labels) that is
unit-tested against a fake client; `PushTester` and `usePushTester` are a thin
view over it. It asks only for a structural `PushTesterClient` (permission,
token, local scheduling), so this folder pulls in no push runtime.
