/**
 * Silent/data-only push handling -- APNs `content-available: 1` / FCM data
 * messages with no `notification` block. Built on expo-notifications'
 * registerTaskAsync + expo-task-manager, the one piece of this tree that
 * needs an actual native task rather than a JS-only listener: JS-only
 * handling isn't reliable once the app is fully backgrounded or killed on
 * either platform.
 *
 * expo-task-manager requires the task to be defined in the module scope of
 * a file required early by the app (its own defineTask doc: "it cannot be
 * called in any of React lifecycle methods") -- so this file defines and
 * registers the task at import time, and setBackgroundHandler below only
 * swaps in which caller-supplied function the already-running task calls.
 */
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
const BACKGROUND_TASK_NAME = 'spectra-lib-push-background-notification';
// iOS gives a background push ~30s to call the completion handler before
// throttling the device's background-push privilege; racing the caller's
// handler against a timeout well under that budget guarantees the task
// executor's promise always resolves, even if the caller's own work hangs.
const COMPLETION_BUDGET_MS = 25000;
let currentHandler = null;
function isNotificationResponse(payload) {
    return 'actionIdentifier' in payload;
}
/**
 * The task payload is NOT the same shape as the foreground listener's
 * Notification object -- it's the raw remote payload, and `notification` is
 * explicitly null for headless/data-only pushes (the design intent this
 * file exists for). A payload with non-null `notification` had visible
 * alert content and is foreground.ts/the OS tray's concern, not this one's.
 */
function toBackgroundEvent(payload) {
    if (isNotificationResponse(payload))
        return null;
    if (payload.notification != null)
        return null;
    // iOS wraps the raw payload as a JSON string in data.dataString; Android's
    // FCM data map lands directly on `data`. Normalize both into one object.
    let data = {};
    const { dataString, ...rest } = payload.data ?? {};
    if (typeof dataString === 'string') {
        try {
            data = JSON.parse(dataString);
        }
        catch {
            data = {};
        }
    }
    else {
        data = rest;
    }
    const categoryId = typeof data.categoryId === 'string' ? data.categoryId : '';
    return { categoryId, title: '', body: '', data, silent: true };
}
function withTimeout(work) {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, COMPLETION_BUDGET_MS);
        work
            .catch(() => undefined)
            .finally(() => {
            clearTimeout(timer);
            resolve();
        });
    });
}
TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
    if (error || !currentHandler)
        return;
    const event = toBackgroundEvent(data);
    if (!event)
        return;
    await withTimeout(currentHandler(event));
});
/**
 * Registers the given async handler for silent/background events, for as
 * long as the returned unsubscribe function isn't called. The consuming
 * project owns what the handler actually does (refetch, update a local
 * cache, ...); this function's job is wiring it to the native task and
 * enforcing the completion-budget contract above.
 */
export function setBackgroundHandler(handler) {
    currentHandler = handler;
    void Notifications.registerTaskAsync(BACKGROUND_TASK_NAME).catch(() => undefined);
    return () => {
        currentHandler = null;
        void Notifications.unregisterTaskAsync(BACKGROUND_TASK_NAME).catch(() => undefined);
    };
}
