import type { NotificationCategory } from './types';
export interface LocalNotificationRequest {
    categoryId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    /** When to fire -- an absolute Date, or a delay in seconds from now. */
    trigger: Date | {
        secondsFromNow: number;
    };
}
/** Schedules one local notification, returning an id usable with cancel(). */
export declare function schedule(request: LocalNotificationRequest, category: NotificationCategory): Promise<string>;
export declare function cancel(id: string): Promise<void>;
export declare function cancelAll(): Promise<void>;
