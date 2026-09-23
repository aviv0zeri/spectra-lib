import type { NotificationCategory } from './types';
/** Creates (or updates the mutable fields of) one Android channel per given
 * category. No-op entirely on iOS. */
export declare function ensureChannels(categories: NotificationCategory[]): Promise<void>;
/** Deletes a channel by category id -- e.g. a category the app no longer
 * sends. No-op on iOS. Does not affect notifications already delivered
 * under that channel. */
export declare function deleteChannel(categoryId: string): Promise<void>;
