/**
 * What happens when a notification arrives while the app is OPEN. Both
 * platforms default to showing nothing in that case; this class is where a
 * project opts in, once, instead of scattering the choice per screen.
 *
 * Two separate jobs, deliberately not tangled together:
 *  - the POLICY (ForegroundPolicy) answers "how should the OS present this?";
 *  - SUBSCRIBERS (subscribe) get told "this arrived" -- how an in-app banner
 *    learns about it, without abusing the policy function as a side channel.
 *
 * The OS has exactly ONE foreground handler per app, so run one client per
 * app: a second presenter that starts replaces the first one's handler (the
 * first then stops receiving, though it still believes it is running).
 */
import type { PushPlatform } from './platform';
import type { ForegroundPresentation, NotificationEvent } from './types';
/** Decides how the OS presents one event. SYNCHRONOUS on purpose: the OS gives
 * the handler ~3 seconds to answer before dropping the notification, so an
 * awaited call of a caller's own can't be allowed to blow that budget. */
export type ForegroundPolicy = (event: NotificationEvent) => ForegroundPresentation;
export type ForegroundListener = (event: NotificationEvent) => void;
/** Show nothing, play nothing, touch no badge -- the OS's own default. */
export declare const SUPPRESS_ALL: ForegroundPresentation;
export declare class ForegroundPresenter {
    private readonly platform;
    private readonly listeners;
    private stopHandler;
    /** True when start() was called (so only stop() ends it), false when it was
     * started on behalf of a subscriber (so the last unsubscribe ends it). */
    private startedExplicitly;
    private policy;
    constructor(platform: PushPlatform, policy?: ForegroundPolicy);
    /** Swaps the policy; takes effect on the next arrival, running or not. */
    setPolicy(policy: ForegroundPolicy): void;
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
    subscribe(listener: ForegroundListener): () => void;
    get running(): boolean;
    /** Installs this presenter as the app's foreground handler and keeps it
     * installed until stop(), even with no subscribers. Idempotent. */
    start(): void;
    /** Removes the handler -- only if it is still the installed one, so this can
     * never wipe a newer owner's handler. Idempotent. */
    stop(): void;
    private install;
    private readonly handle;
}
