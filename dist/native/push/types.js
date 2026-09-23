/**
 * Shared types for the push-notification interface. See README.md for scope
 * and the Apple/Google doc references these are built against.
 */
/** Thrown when a notification is scheduled for a category nobody registered
 * with the ChannelRegistry -- the category carries the channel and sound, so
 * guessing would silently post to the wrong (or a missing) channel. */
export class UnknownCategoryError extends Error {
    constructor(categoryId) {
        super(`No notification category registered with id "${categoryId}"`);
        // Subclassing Error breaks `instanceof` when a build transpiles classes to
        // ES5; restoring the prototype keeps `error instanceof UnknownCategoryError`
        // true whichever way the consuming app compiles this.
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'UnknownCategoryError';
        this.categoryId = categoryId;
    }
}
