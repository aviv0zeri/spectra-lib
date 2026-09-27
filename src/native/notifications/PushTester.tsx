/**
 * A screen body for testing a project's push-notification setup end to end:
 * shows the permission state, lets you write a title and body, fires a real
 * LOCAL notification a couple of seconds out, lists what was sent (with a
 * "reuse" action), and fetches this device's push token.
 *
 * A local notification takes exactly the path a remote push takes once it
 * reaches the device -- with the app open, the foreground handler catches it
 * and the app shows its in-app banner; backgrounded, the OS shows its own. And
 * remote push mostly can't reach an iOS Simulator at all, so a local one is the
 * only way to exercise this there. It needs no server, sign-in or token.
 *
 * Same boundary as the rest of this package: no icon library, no default
 * colors, no built-in strings. The caller supplies `colors`, `labels` (every
 * word, so it can be translated), `icons`, and any screen chrome (title bar,
 * back button) around it -- this renders only the scrolling body. The logic
 * lives in PushTesterController; this file is a view over it.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { AppState, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { NotificationRow } from './NotificationRow';
import { PushTesterController } from './PushTesterController';
import type { PushTesterClient, PushTesterState, PushTesterStatus } from './PushTesterController';
import type { NotificationColors } from './types';

/** How long the two send buttons wait before firing, in seconds. */
export const PUSH_TESTER_DELAYS = { soon: 2, later: 10 } as const;

/**
 * Every word the tester shows. Two carry a placeholder the tester fills in:
 * `scheduled` has `{n}` (seconds) and `tapped` has `{title}`.
 */
export interface PushTesterLabels {
  intro: string;
  permission: string;
  permissionChecking: string;
  permissionGranted: string;
  permissionDenied: string;
  permissionUndetermined: string;
  permissionUnavailable: string;
  permissionFailed: string;
  ask: string;
  deniedHint: string;
  fieldTitle: string;
  fieldBody: string;
  /** Button that fires after PUSH_TESTER_DELAYS.soon seconds. */
  sendSoon: string;
  /** Button that fires after PUSH_TESTER_DELAYS.later seconds. */
  sendLater: string;
  /** Shown under the buttons while notifications aren't allowed. */
  sendOff: string;
  sent: string;
  sentEmpty: string;
  reuse: string;
  token: string;
  getToken: string;
  noToken: string;
  /** Contains `{n}`. */
  scheduled: string;
  /** Prefix for a scheduling error; the error's own message follows it. */
  scheduleFailed: string;
  /** Contains `{title}`. */
  tapped: string;
}

export interface PushTesterIcons {
  /** Beside the permission line when notifications are allowed. */
  permissionGranted?: ReactNode;
  /** Beside the permission line otherwise. */
  permissionMissing?: ReactNode;
  /** In each sent-test row. */
  notification?: ReactNode;
}

export interface PushTesterProps {
  client: PushTesterClient;
  /** A category registered with the client; test notifications go out under it. */
  categoryId: string;
  defaultTitle: string;
  defaultBody: string;
  labels: PushTesterLabels;
  colors: NotificationColors;
  icons?: PushTesterIcons;
  rtl?: boolean;
  /** Style for the outer scroll view. */
  style?: StyleProp<ViewStyle>;
  /** Formats the time on a sent test (default: the device's locale time). */
  formatTime?: (date: Date) => string;
  testID?: string;
}

/**
 * Builds a controller for a client + options and keeps it alive for as long as
 * the component is mounted. Returns the live state and the controller.
 *
 * The controller is built once per `client` + `categoryId`: the defaults seed
 * the form once (a re-render with new default text never wipes what the user
 * typed) and `formatTime` is read once, so pass a stable function. Permission
 * is re-read whenever the app returns to the foreground, so granting it in the
 * OS Settings and coming back updates the screen.
 */
export function usePushTester(
  client: PushTesterClient,
  options: {
    categoryId: string;
    defaultTitle: string;
    defaultBody: string;
    formatTime?: (date: Date) => string;
  },
): { state: PushTesterState; controller: PushTesterController } {
  // Deliberately keyed on the client and category only: the defaults seed the
  // form once, and a re-render with new default text must not wipe what the
  // user has typed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const controller = useMemo(() => new PushTesterController(client, options), [client, options.categoryId]);
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  useEffect(() => {
    void controller.init();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void controller.init();
    });
    return () => {
      subscription.remove();
      controller.dispose();
    };
  }, [controller]);
  return { state, controller };
}

function statusText(status: PushTesterStatus, labels: PushTesterLabels): string {
  switch (status.kind) {
    case 'scheduled':
      return labels.scheduled.replace('{n}', () => String(status.seconds));
    case 'scheduleFailed':
      return `${labels.scheduleFailed} ${status.message}`;
    case 'permissionFailed':
      return labels.permissionFailed;
    case 'tapped':
      return labels.tapped.replace('{title}', () => status.title);
  }
}

function permissionText(permission: PushTesterState['permission'], labels: PushTesterLabels): string {
  switch (permission) {
    case null:
      return labels.permissionChecking;
    case 'granted':
      return labels.permissionGranted;
    case 'denied':
      return labels.permissionDenied;
    case 'undetermined':
      return labels.permissionUndetermined;
    case 'unavailable':
      return labels.permissionUnavailable;
  }
}

function TesterButton({
  label,
  onPress,
  colors,
  primary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  colors: NotificationColors;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: primary ? colors.accent : colors.panel,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.rim,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: primary ? colors.onAccent : colors.text,
          fontWeight: '600',
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PushTester({
  client,
  categoryId,
  defaultTitle,
  defaultBody,
  labels,
  colors,
  icons,
  rtl,
  style,
  formatTime,
  testID,
}: PushTesterProps) {
  const { state, controller } = usePushTester(client, { categoryId, defaultTitle, defaultBody, formatTime });
  const granted = state.permission === 'granted';
  const textAlign = rtl ? 'right' : 'left';
  // An explicit `direction` (not row-reverse) so rows lay out the same whether
  // the app mirrors its layout natively or only in JS -- see CalendarGrid.
  const direction = rtl ? 'rtl' : 'ltr';

  const writingDirection = direction;
  const label = {
    color: colors.muted,
    fontSize: 12,
    marginTop: 16,
    marginBottom: 6,
    textAlign,
    writingDirection,
  } as const;
  const note = { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign, writingDirection } as const;
  const plain = { color: colors.text, textAlign, writingDirection } as const;
  const input = {
    color: colors.text,
    backgroundColor: colors.panel,
    borderColor: colors.rim,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlign,
    writingDirection,
  } as const;

  return (
    <ScrollView
      style={[{ flex: 1 }, style]}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      <Text style={note}>{labels.intro}</Text>

      <Text style={label} accessibilityRole="header">
        {labels.permission}
      </Text>
      <View style={{ flexDirection: 'row', direction, alignItems: 'center', gap: 10 }}>
        {granted ? icons?.permissionGranted : icons?.permissionMissing}
        <Text style={[plain, { fontSize: 15, flexShrink: 1 }]}>
          {permissionText(state.permission, labels)}
        </Text>
      </View>
      {state.permission === 'undetermined' ? (
        <View style={{ marginTop: 8 }}>
          <TesterButton label={labels.ask} onPress={() => void controller.askPermission()} colors={colors} />
        </View>
      ) : null}
      {state.permission === 'denied' ? (
        <Text style={[note, { marginTop: 6 }]}>{labels.deniedHint}</Text>
      ) : null}

      <Text style={label} accessibilityRole="header">
        {labels.fieldTitle}
      </Text>
      <TextInput
        value={state.title}
        onChangeText={(text) => controller.setTitle(text)}
        style={input}
        accessibilityLabel={labels.fieldTitle}
        placeholder={labels.fieldTitle}
        placeholderTextColor={colors.muted}
      />
      <Text style={label} accessibilityRole="header">
        {labels.fieldBody}
      </Text>
      <TextInput
        value={state.body}
        onChangeText={(text) => controller.setBody(text)}
        style={[input, { minHeight: 76, textAlignVertical: 'top' }]}
        accessibilityLabel={labels.fieldBody}
        placeholder={labels.fieldBody}
        placeholderTextColor={colors.muted}
        multiline
      />

      <View style={{ flexDirection: 'row', direction, gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <TesterButton
            label={labels.sendSoon}
            onPress={() => void controller.send(PUSH_TESTER_DELAYS.soon)}
            colors={colors}
            primary
            disabled={!granted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TesterButton
            label={labels.sendLater}
            onPress={() => void controller.send(PUSH_TESTER_DELAYS.later)}
            colors={colors}
            disabled={!granted}
          />
        </View>
      </View>
      {!granted && state.permission !== null ? (
        <Text style={[note, { marginTop: 6 }]}>{labels.sendOff}</Text>
      ) : null}
      {state.status ? (
        <Text style={[plain, { fontSize: 13, marginTop: 10 }]} accessibilityLiveRegion="polite">
          {statusText(state.status, labels)}
        </Text>
      ) : null}

      <Text style={label} accessibilityRole="header">
        {labels.sent}
      </Text>
      {state.sent.length === 0 ? (
        <Text style={note}>{labels.sentEmpty}</Text>
      ) : (
        state.sent.map((entry) => (
          <View key={entry.id} style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden' }}>
            <NotificationRow
              id={entry.id}
              event={{ categoryId, title: entry.title, body: entry.body, data: {}, silent: false }}
              timestamp={entry.at}
              icon={icons?.notification}
              unreadIndicator={
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }}
                />
              }
              read={false}
              actions={[{ label: labels.reuse, onPress: () => controller.reuse(entry.id) }]}
              colors={colors}
              rtl={rtl}
              onPress={() => controller.noteTapped(entry.id)}
              onDismiss={() => controller.dismiss(entry.id)}
            />
          </View>
        ))
      )}

      <Text style={label} accessibilityRole="header">
        {labels.token}
      </Text>
      <TesterButton label={labels.getToken} onPress={() => void controller.fetchToken()} colors={colors} />
      {state.token === undefined ? null : (
        <Text selectable style={[note, { color: colors.text, marginTop: 8 }]}>
          {state.token ?? labels.noToken}
        </Text>
      )}
    </ScrollView>
  );
}
