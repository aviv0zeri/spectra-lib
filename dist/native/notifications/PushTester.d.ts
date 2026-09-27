import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { PushTesterController } from './PushTesterController';
import type { PushTesterClient, PushTesterState } from './PushTesterController';
import type { NotificationColors } from './types';
/** How long the two send buttons wait before firing, in seconds. */
export declare const PUSH_TESTER_DELAYS: {
    readonly soon: 2;
    readonly later: 10;
};
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
export declare function usePushTester(client: PushTesterClient, options: {
    categoryId: string;
    defaultTitle: string;
    defaultBody: string;
    formatTime?: (date: Date) => string;
}): {
    state: PushTesterState;
    controller: PushTesterController;
};
export declare function PushTester({ client, categoryId, defaultTitle, defaultBody, labels, colors, icons, rtl, style, formatTime, testID, }: PushTesterProps): import("react").JSX.Element;
