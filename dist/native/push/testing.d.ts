/**
 * FakePushPlatform -- an in-memory PushPlatform for tests, exported as
 * spectra-lib/native/push/testing so a consuming project can test its own
 * code against a real PushNotificationClient without a device or expo.
 *
 * It records what the classes ask of the OS (channels, scheduled
 * notifications, cancellations) and lets a test play the OS's part: change the
 * permission answer, deliver a foreground notification, fire a tap.
 */
import type { PlatformChannelConfig, PlatformForegroundHandler, PlatformScheduleRequest, PushPlatform, RawNotification, RawNotificationResponse } from './platform';
import type { ForegroundPresentation } from './types';
export interface ScheduledRecord {
    id: string;
    request: PlatformScheduleRequest;
}
export declare class FakePushPlatform implements PushPlatform {
    os: string;
    /** What getPermissionStatus() reports. */
    permission: string;
    /** What requestPermission() flips `permission` to (and returns). */
    answerToRequest: string;
    projectId: string | undefined;
    /** What getExpoPushToken() resolves; set an Error to make it reject. */
    token: string | null | Error;
    readonly channels: Map<string, PlatformChannelConfig>;
    readonly deletedChannels: string[];
    readonly scheduled: ScheduledRecord[];
    readonly cancelled: string[];
    cancelledAll: number;
    permissionRequests: number;
    private foregroundHandler;
    private readonly tokenListeners;
    private readonly responseListeners;
    private lastResponse;
    private nextId;
    constructor(os?: string);
    getPermissionStatus(): Promise<string>;
    requestPermission(): Promise<string>;
    getProjectId(): string | undefined;
    getExpoPushToken(_projectId: string): Promise<string | null>;
    addPushTokenListener(listener: () => void): () => void;
    setChannel(id: string, config: PlatformChannelConfig): Promise<void>;
    deleteChannel(id: string): Promise<void>;
    setForegroundHandler(handler: PlatformForegroundHandler): () => void;
    schedule(request: PlatformScheduleRequest): Promise<string>;
    cancel(id: string): Promise<void>;
    cancelAll(): Promise<void>;
    addResponseListener(listener: (response: RawNotificationResponse) => void): () => void;
    getLastResponse(): RawNotificationResponse | null;
    clearLastResponse(): void;
    /** How many native-token listeners are attached right now. */
    get tokenListenerCount(): number;
    /** How many tap listeners are attached right now. */
    get responseListenerCount(): number;
    /** Whether a foreground handler is currently installed. */
    get hasForegroundHandler(): boolean;
    /** Deliver a notification while "the app is open". Returns how the handler
     * asked the OS to present it, or null if no handler is installed. */
    deliverForeground(raw: RawNotification): ForegroundPresentation | null;
    /** The native push token changed. */
    changeToken(): void;
    /** The user tapped a notification while the app was running. */
    tap(raw: RawNotification): void;
    /** The app was cold-launched by tapping a notification. */
    launchFromTap(raw: RawNotification): void;
}
