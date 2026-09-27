import { UnknownCategoryError } from './types';
/**
 * NotificationCategory.sound is documented (types.ts) as a filename WITH
 * extension, matching iOS's convention -- but Android's channel `sound` field
 * wants the raw resource name with no extension. Stripping it here keeps that
 * one field usable from both platforms without pushing the difference onto
 * every caller.
 */
export function androidSoundName(sound) {
    if (!sound)
        return undefined;
    if (sound === 'default')
        return 'default';
    return sound.replace(/\.[^/.]+$/, '');
}
export class ChannelRegistry {
    constructor(platform, categories = []) {
        this.platform = platform;
        this.categories = new Map();
        this.register(...categories);
    }
    /** Adds categories (a category with an already-registered id replaces it).
     * Does not touch the OS -- call sync() or let LocalNotifier.schedule create
     * the channel it needs. */
    register(...categories) {
        for (const category of categories)
            this.categories.set(category.id, category);
        return this;
    }
    get(id) {
        return this.categories.get(id);
    }
    /** The category, or an UnknownCategoryError naming the id nobody registered. */
    require(id) {
        const category = this.categories.get(id);
        if (!category)
            throw new UnknownCategoryError(id);
        return category;
    }
    list() {
        return [...this.categories.values()];
    }
    /** Creates (or updates the mutable fields of) the channel for every
     * registered category. Call once at startup, before any push can arrive. */
    async sync() {
        await Promise.all(this.list().map((category) => this.push(category)));
    }
    /** Creates (or updates) the channel for one registered category. */
    async ensure(id) {
        await this.push(this.require(id));
    }
    /** Forgets the category and deletes its channel -- e.g. a kind of
     * notification the app no longer sends. Already-delivered notifications
     * are unaffected. */
    async remove(id) {
        this.categories.delete(id);
        if (this.platform.os !== 'android')
            return;
        await this.platform.deleteChannel(id);
    }
    async push(category) {
        if (this.platform.os !== 'android')
            return;
        await this.platform.setChannel(category.id, {
            name: category.displayName,
            importance: category.importance,
            sound: androidSoundName(category.sound),
            vibrate: category.vibrate,
        });
    }
}
