/**
 * LOCAL notifications -- scheduled entirely on-device, no push token or
 * server involved. A local notification takes exactly the path a remote push
 * takes once it reaches the device (same foreground handler, same tap
 * routing), which is why this is also the way to exercise that path on a
 * simulator that can't receive real remote pushes.
 */
import type { ChannelRegistry } from './ChannelRegistry';
import type { PushPlatform } from './platform';
export interface LocalNotificationRequest {
    /** Must be a category registered with the ChannelRegistry. */
    categoryId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    /** When to fire -- an absolute Date, or a delay in seconds from now. */
    trigger: Date | {
        secondsFromNow: number;
    };
}
export declare class LocalNotifier {
    private readonly platform;
    private readonly channels;
    constructor(platform: PushPlatform, channels: ChannelRegistry);
    /**
     * Schedules one local notification and returns an id usable with cancel().
     * Throws UnknownCategoryError if the category was never registered, and
     * RangeError for a non-positive delay.
     */
    schedule(request: LocalNotificationRequest): Promise<string>;
    cancel(id: string): Promise<void>;
    cancelAll(): Promise<void>;
}
