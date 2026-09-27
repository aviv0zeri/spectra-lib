import { PushNotificationClient } from './PushNotificationClient';
import type { PushClientOptions } from './PushNotificationClient';
import type { PushPlatform } from './platform';
export declare function createExpoPlatform(): PushPlatform;
/** The client apps actually construct: a PushNotificationClient on the real
 * expo-notifications platform. */
export declare function createExpoPushClient(options?: Omit<PushClientOptions, 'platform'>): PushNotificationClient;
