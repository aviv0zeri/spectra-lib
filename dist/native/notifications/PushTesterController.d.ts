/**
 * The logic behind PushTester, with no React and no strings in it: a plain
 * class holding the tester's state and the actions that change it, so it can be
 * unit-tested against a fake client and any view can drive it. PushTester.tsx
 * is the React view over it; usePushTester adapts it to useSyncExternalStore.
 *
 * It only ever needs three things of a push client -- permission, token and
 * local scheduling -- so it asks for exactly those (PushTesterClient) and
 * imports the real types as `import type`, which keeps this file, and the
 * `spectra-lib/native` barrel it ships in, free of any push/expo runtime.
 * A PushNotificationClient satisfies the shape as-is.
 */
import type { LocalNotificationRequest } from '../push/LocalNotifier';
import type { PermissionStatus, PushToken } from '../push/types';
/** The slice of a PushNotificationClient the tester uses. */
export interface PushTesterClient {
    permissions: {
        getStatus(): Promise<PermissionStatus>;
        request(): Promise<PermissionStatus>;
    };
    provider: {
        register(): Promise<PushToken | null>;
    };
    local: {
        schedule(request: LocalNotificationRequest): Promise<string>;
    };
}
/** One test notification the tester has scheduled. */
export interface SentTest {
    id: string;
    title: string;
    body: string;
    /** Pre-formatted time it was sent -- see PushTesterControllerOptions.formatTime. */
    at: string;
}
/** What the last action did, as data -- the view turns it into words with the
 * caller's own labels, so this class never holds a translated string. */
export type PushTesterStatus = {
    kind: 'scheduled';
    seconds: number;
} | {
    kind: 'scheduleFailed';
    message: string;
} | {
    kind: 'permissionFailed';
} | {
    kind: 'tapped';
    title: string;
};
export interface PushTesterState {
    title: string;
    body: string;
    /** null = still checking; 'unavailable' = the OS couldn't say. */
    permission: PermissionStatus | 'unavailable' | null;
    /** undefined = never asked, null = asked but none could be had, else the token. */
    token: string | null | undefined;
    status: PushTesterStatus | null;
    /** Newest first, capped at maxSent. */
    sent: SentTest[];
}
export interface PushTesterControllerOptions {
    /** The (registered) notification category the test notifications go out under. */
    categoryId: string;
    defaultTitle: string;
    defaultBody: string;
    /** How many sent tests to keep in the list. Default 6. */
    maxSent?: number;
    /** Clock -- injectable so tests are deterministic. */
    now?: () => Date;
    /** Formats the time shown on a sent test. Default: the device's locale time. */
    formatTime?: (date: Date) => string;
}
export declare class PushTesterController {
    private readonly client;
    private readonly options;
    private state;
    private readonly listeners;
    private nextId;
    private generation;
    /** Bumped whenever the permission is set by an action, so a slower init()
     * read that started earlier can't overwrite the newer answer. */
    private permissionSeq;
    constructor(client: PushTesterClient, options: PushTesterControllerOptions);
    /** The current state. A NEW object after every change (never mutated), so it
     * works directly as a useSyncExternalStore snapshot. */
    getState: () => PushTesterState;
    subscribe: (listener: () => void) => (() => void);
    /** Reads the current permission. Call on mount; safe to call again. A result
     * that lands after dispose() is dropped. */
    init(): Promise<void>;
    /** Detaches from in-flight work: results that arrive afterwards are ignored. */
    dispose(): void;
    setTitle(title: string): void;
    setBody(body: string): void;
    askPermission(): Promise<void>;
    /** Schedules the current title/body to fire `secondsFromNow` from now. */
    send(secondsFromNow: number): Promise<void>;
    /** The time to show on a sent test. The notification is already scheduled by
     * now, so a caller's formatter throwing must not turn that into a failure:
     * fall back to the device's locale time. */
    private timeLabel;
    /** Asks the token provider for this device's token. A null means none
     * could be had (including a provider that failed). */
    fetchToken(): Promise<void>;
    /** Copies a sent test's title/body back into the form. */
    reuse(id: string): void;
    dismiss(id: string): void;
    /** Records that a sent test was tapped, so the view can say so. */
    noteTapped(id: string): void;
    private set;
}
