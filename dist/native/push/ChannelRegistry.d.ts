/**
 * The set of NotificationCategory objects a project sends, and their Android
 * NotificationChannels -- one channel per category, so a user can mute
 * "gate activity" without also muting "payment failed". iOS has no channel
 * concept, so every method that touches the OS is a no-op there and callers
 * never need a platform branch of their own.
 *
 * It is also the lookup LocalNotifier uses: a category carries the channel id
 * and sound, so scheduling takes only a category id and asks the registry.
 */
import type { PushPlatform } from './platform';
import type { NotificationCategory } from './types';
/**
 * NotificationCategory.sound is documented (types.ts) as a filename WITH
 * extension, matching iOS's convention -- but Android's channel `sound` field
 * wants the raw resource name with no extension. Stripping it here keeps that
 * one field usable from both platforms without pushing the difference onto
 * every caller.
 */
export declare function androidSoundName(sound: string | undefined): string | undefined;
export declare class ChannelRegistry {
    private readonly platform;
    private readonly categories;
    constructor(platform: PushPlatform, categories?: readonly NotificationCategory[]);
    /** Adds categories (a category with an already-registered id replaces it).
     * Does not touch the OS -- call sync() or let LocalNotifier.schedule create
     * the channel it needs. */
    register(...categories: NotificationCategory[]): this;
    get(id: string): NotificationCategory | undefined;
    /** The category, or an UnknownCategoryError naming the id nobody registered. */
    require(id: string): NotificationCategory;
    list(): NotificationCategory[];
    /** Creates (or updates the mutable fields of) the channel for every
     * registered category. Call once at startup, before any push can arrive. */
    sync(): Promise<void>;
    /** Creates (or updates) the channel for one registered category. */
    ensure(id: string): Promise<void>;
    /** Forgets the category and deletes its channel -- e.g. a kind of
     * notification the app no longer sends. Already-delivered notifications
     * are unaffected. */
    remove(id: string): Promise<void>;
    private push;
}
