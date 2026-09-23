function toTrigger(trigger) {
    if (trigger instanceof Date)
        return { kind: 'date', date: trigger };
    const seconds = trigger.secondsFromNow;
    // The OS rejects a non-positive interval with an opaque native error;
    // failing here names the actual mistake.
    if (!Number.isFinite(seconds) || seconds <= 0) {
        throw new RangeError(`secondsFromNow must be a positive number, got ${seconds}`);
    }
    return { kind: 'interval', seconds };
}
/** NotificationCategory.sound's 'default' is this tree's own convention (the
 * iOS sound-name / channel convention) -- the platform's scheduling API wants
 * a bare `true` for "play the default sound." */
function contentSound(sound) {
    if (sound === undefined)
        return undefined;
    return sound === 'default' ? true : sound;
}
export class LocalNotifier {
    constructor(platform, channels) {
        this.platform = platform;
        this.channels = channels;
    }
    /**
     * Schedules one local notification and returns an id usable with cancel().
     * Throws UnknownCategoryError if the category was never registered, and
     * RangeError for a non-positive delay.
     */
    async schedule(request) {
        const category = this.channels.require(request.categoryId);
        const trigger = toTrigger(request.trigger);
        await this.channels.ensure(category.id);
        const scheduled = {
            title: request.title,
            body: request.body,
            // Stamped alongside the caller's own data so a fired local notification
            // resolves through the same categoryId convention as a remote push (see
            // internal/notification.ts). Last, so a caller can't override it --
            // categoryIdentifier below is only the iOS fallback path.
            data: { ...request.data, categoryId: category.id },
            categoryIdentifier: category.id,
            sound: contentSound(category.sound),
            trigger,
            channelId: category.id,
        };
        return this.platform.schedule(scheduled);
    }
    cancel(id) {
        return this.platform.cancel(id);
    }
    cancelAll() {
        return this.platform.cancelAll();
    }
}
