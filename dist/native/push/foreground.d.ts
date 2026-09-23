import type { NotificationEvent } from './types';
export interface ForegroundPresentation {
    /** Whether to show a visible banner/alert while the app is foregrounded.
     * iOS: maps to shouldShowBanner/shouldShowList; Android: whether the
     * notification is posted to the tray at all while the activity is
     * resumed. */
    showBanner: boolean;
    playSound: boolean;
    updateBadge: boolean;
}
/**
 * Registers the given decision function as this device's foreground
 * presentation handler -- called once per incoming event while the app is
 * open, for as long as the returned unsubscribe function isn't called.
 */
export declare function setForegroundHandler(decide: (event: NotificationEvent) => ForegroundPresentation): () => void;
