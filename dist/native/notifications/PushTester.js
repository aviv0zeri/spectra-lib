import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { AppState, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { NotificationRow } from './NotificationRow';
import { PushTesterController } from './PushTesterController';
/** How long the two send buttons wait before firing, in seconds. */
export const PUSH_TESTER_DELAYS = { soon: 2, later: 10 };
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
export function usePushTester(client, options) {
    // Deliberately keyed on the client and category only: the defaults seed the
    // form once, and a re-render with new default text must not wipe what the
    // user has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const controller = useMemo(() => new PushTesterController(client, options), [client, options.categoryId]);
    const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
    useEffect(() => {
        void controller.init();
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active')
                void controller.init();
        });
        return () => {
            subscription.remove();
            controller.dispose();
        };
    }, [controller]);
    return { state, controller };
}
function statusText(status, labels) {
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
function permissionText(permission, labels) {
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
function TesterButton({ label, onPress, colors, primary = false, disabled = false, }) {
    return (_jsx(Pressable, { onPress: onPress, disabled: disabled, accessibilityRole: "button", accessibilityState: { disabled }, style: ({ pressed }) => ({
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: primary ? colors.accent : colors.panel,
            borderWidth: primary ? 0 : 1,
            borderColor: colors.rim,
            opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        }), children: _jsx(Text, { style: {
                color: primary ? colors.onAccent : colors.text,
                fontWeight: '600',
                fontSize: 14,
                textAlign: 'center',
            }, children: label }) }));
}
export function PushTester({ client, categoryId, defaultTitle, defaultBody, labels, colors, icons, rtl, style, formatTime, testID, }) {
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
    };
    const note = { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign, writingDirection };
    const plain = { color: colors.text, textAlign, writingDirection };
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
    };
    return (_jsxs(ScrollView, { style: [{ flex: 1 }, style], contentContainerStyle: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 48 }, keyboardShouldPersistTaps: "handled", showsVerticalScrollIndicator: false, testID: testID, children: [_jsx(Text, { style: note, children: labels.intro }), _jsx(Text, { style: label, accessibilityRole: "header", children: labels.permission }), _jsxs(View, { style: { flexDirection: 'row', direction, alignItems: 'center', gap: 10 }, children: [granted ? icons?.permissionGranted : icons?.permissionMissing, _jsx(Text, { style: [plain, { fontSize: 15, flexShrink: 1 }], children: permissionText(state.permission, labels) })] }), state.permission === 'undetermined' ? (_jsx(View, { style: { marginTop: 8 }, children: _jsx(TesterButton, { label: labels.ask, onPress: () => void controller.askPermission(), colors: colors }) })) : null, state.permission === 'denied' ? (_jsx(Text, { style: [note, { marginTop: 6 }], children: labels.deniedHint })) : null, _jsx(Text, { style: label, accessibilityRole: "header", children: labels.fieldTitle }), _jsx(TextInput, { value: state.title, onChangeText: (text) => controller.setTitle(text), style: input, accessibilityLabel: labels.fieldTitle, placeholder: labels.fieldTitle, placeholderTextColor: colors.muted }), _jsx(Text, { style: label, accessibilityRole: "header", children: labels.fieldBody }), _jsx(TextInput, { value: state.body, onChangeText: (text) => controller.setBody(text), style: [input, { minHeight: 76, textAlignVertical: 'top' }], accessibilityLabel: labels.fieldBody, placeholder: labels.fieldBody, placeholderTextColor: colors.muted, multiline: true }), _jsxs(View, { style: { flexDirection: 'row', direction, gap: 10, marginTop: 16 }, children: [_jsx(View, { style: { flex: 1 }, children: _jsx(TesterButton, { label: labels.sendSoon, onPress: () => void controller.send(PUSH_TESTER_DELAYS.soon), colors: colors, primary: true, disabled: !granted }) }), _jsx(View, { style: { flex: 1 }, children: _jsx(TesterButton, { label: labels.sendLater, onPress: () => void controller.send(PUSH_TESTER_DELAYS.later), colors: colors, disabled: !granted }) })] }), !granted && state.permission !== null ? (_jsx(Text, { style: [note, { marginTop: 6 }], children: labels.sendOff })) : null, state.status ? (_jsx(Text, { style: [plain, { fontSize: 13, marginTop: 10 }], accessibilityLiveRegion: "polite", children: statusText(state.status, labels) })) : null, _jsx(Text, { style: label, accessibilityRole: "header", children: labels.sent }), state.sent.length === 0 ? (_jsx(Text, { style: note, children: labels.sentEmpty })) : (state.sent.map((entry) => (_jsx(View, { style: { marginBottom: 8, borderRadius: 12, overflow: 'hidden' }, children: _jsx(NotificationRow, { id: entry.id, event: { categoryId, title: entry.title, body: entry.body, data: {}, silent: false }, timestamp: entry.at, icon: icons?.notification, unreadIndicator: _jsx(View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent } }), read: false, actions: [{ label: labels.reuse, onPress: () => controller.reuse(entry.id) }], colors: colors, rtl: rtl, onPress: () => controller.noteTapped(entry.id), onDismiss: () => controller.dismiss(entry.id) }) }, entry.id)))), _jsx(Text, { style: label, accessibilityRole: "header", children: labels.token }), _jsx(TesterButton, { label: labels.getToken, onPress: () => void controller.fetchToken(), colors: colors }), state.token === undefined ? null : (_jsx(Text, { selectable: true, style: [note, { color: colors.text, marginTop: 8 }], children: state.token ?? labels.noToken }))] }));
}
