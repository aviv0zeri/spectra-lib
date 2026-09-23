/**
 * PushPlatform -- the ONE seam between this tree and the device.
 *
 * Every class in this folder (PermissionManager, ExpoPushProvider,
 * ChannelRegistry, LocalNotifier, ForegroundPresenter, DeepLinkRouter) talks
 * to the OS only through this interface. expoPlatform.ts is the real
 * implementation (the only file besides background.ts that imports
 * expo-notifications); fakePlatform.ts is the in-memory one the unit tests use.
 * That is what lets the classes be tested without a device, and what would let
 * a project swap the delivery stack without touching any caller.
 *
 * Deliberately narrow and expo-free: nothing here mentions an expo type, so
 * importing this file (or any class that only takes a PushPlatform) never
 * resolves a native module.
 */
import type { ForegroundPresentation } from './types';
/** The bits of an incoming notification this tree cares about, already lifted
 * out of whatever shape the OS layer delivers. Every field can be absent. */
export interface RawNotification {
    title?: string | null;
    body?: string | null;
    data?: Record<string, unknown> | null;
    /** iOS UNNotificationCategory identifier -- only a fallback for categoryId. */
    categoryIdentifier?: string | null;
}
export interface RawNotificationResponse {
    notification: RawNotification;
}
export type ChannelImportance = 'min' | 'low' | 'default' | 'high' | 'max';
export interface PlatformChannelConfig {
    name: string;
    importance: ChannelImportance;
    /** Android resource name (no extension), or 'default', or undefined. */
    sound?: string;
    vibrate?: boolean;
}
export type PlatformTrigger = {
    kind: 'date';
    date: Date;
} | {
    kind: 'interval';
    seconds: number;
};
export interface PlatformScheduleRequest {
    title: string;
    body: string;
    data: Record<string, unknown>;
    /** iOS UNNotificationCategory identifier. */
    categoryIdentifier: string;
    /** `true` = the platform default sound, a string = a bundled sound file
     * name, undefined = whatever the platform does when unspecified. */
    sound?: boolean | string;
    trigger: PlatformTrigger;
    /** Android channel to post under (ignored on iOS). */
    channelId: string;
}
/** Decides, synchronously, how the OS should present a foreground arrival. */
export type PlatformForegroundHandler = (notification: RawNotification) => ForegroundPresentation;
export interface PushPlatform {
    /** 'ios' | 'android' | ... -- the same string react-native's Platform.OS gives. */
    readonly os: string;
    /** Raw OS permission status; callers normalize it (see PermissionManager). */
    getPermissionStatus(): Promise<string>;
    requestPermission(): Promise<string>;
    /** The EAS project id this build was made for, when it has one. */
    getProjectId(): string | undefined;
    getExpoPushToken(projectId: string): Promise<string | null>;
    /** Fires whenever the underlying native token changes. */
    addPushTokenListener(listener: () => void): () => void;
    setChannel(id: string, config: PlatformChannelConfig): Promise<void>;
    deleteChannel(id: string): Promise<void>;
    /**
     * Installs the OS-level foreground handler (there is exactly one per app).
     * The returned function removes it, and ONLY if it is still the installed
     * one -- so a stale owner tearing down can never wipe a newer owner's handler.
     */
    setForegroundHandler(handler: PlatformForegroundHandler): () => void;
    schedule(request: PlatformScheduleRequest): Promise<string>;
    cancel(id: string): Promise<void>;
    cancelAll(): Promise<void>;
    addResponseListener(listener: (response: RawNotificationResponse) => void): () => void;
    getLastResponse(): RawNotificationResponse | null;
    clearLastResponse(): void;
}
