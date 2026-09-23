import { toNotificationEvent } from './internal/notification';
/** Show nothing, play nothing, touch no badge -- the OS's own default. */
export const SUPPRESS_ALL = {
    showBanner: false,
    playSound: false,
    updateBadge: false,
};
export class ForegroundPresenter {
    constructor(platform, policy = () => SUPPRESS_ALL) {
        this.platform = platform;
        this.listeners = new Set();
        this.stopHandler = null;
        /** True when start() was called (so only stop() ends it), false when it was
         * started on behalf of a subscriber (so the last unsubscribe ends it). */
        this.startedExplicitly = false;
        this.handle = (raw) => {
            const event = toNotificationEvent(raw);
            // Silent/data-only events are background.ts's concern even when they
            // technically arrive while foregrounded -- never let one reach a
            // subscriber or the policy.
            if (event.silent)
                return SUPPRESS_ALL;
            for (const listener of [...this.listeners]) {
                try {
                    listener(event);
                }
                catch {
                    // One subscriber's bug must not swallow the notification.
                }
            }
            try {
                return this.policy(event);
            }
            catch {
                return SUPPRESS_ALL;
            }
        };
        this.policy = policy;
    }
    /** Swaps the policy; takes effect on the next arrival, running or not. */
    setPolicy(policy) {
        this.policy = policy;
    }
    /**
     * Called with every visible (non-silent) notification that arrives while
     * the app is open, before the policy decides how the OS shows it. A
     * listener that throws never affects the others or the notification.
     *
     * Subscribing starts the presenter if it isn't running -- a subscriber that
     * silently never fires because nobody called start() is the easy mistake to
     * make here. When the last subscriber leaves, a presenter that was started
     * this way stops again; one started with an explicit start() keeps running
     * (its policy still applies with nobody listening) until stop().
     */
    subscribe(listener) {
        this.listeners.add(listener);
        this.install();
        return () => {
            this.listeners.delete(listener);
            if (this.listeners.size === 0 && !this.startedExplicitly)
                this.stop();
        };
    }
    get running() {
        return this.stopHandler !== null;
    }
    /** Installs this presenter as the app's foreground handler and keeps it
     * installed until stop(), even with no subscribers. Idempotent. */
    start() {
        this.startedExplicitly = true;
        this.install();
    }
    /** Removes the handler -- only if it is still the installed one, so this can
     * never wipe a newer owner's handler. Idempotent. */
    stop() {
        const stop = this.stopHandler;
        this.stopHandler = null;
        this.startedExplicitly = false;
        stop?.();
    }
    install() {
        if (this.stopHandler)
            return;
        this.stopHandler = this.platform.setForegroundHandler(this.handle);
    }
}
