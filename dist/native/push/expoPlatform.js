/**
 * The real PushPlatform: expo-notifications (+ expo-constants, react-native's
 * Platform). This and background.ts are the only files in the tree that import
 * expo-notifications -- everything else takes a PushPlatform, so this is the
 * single place an expo API change or a swap to another delivery stack lands.
 *
 * Nothing here runs at import time and constructing the platform touches no
 * native module; each method reaches expo only when called.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PushNotificationClient } from './PushNotificationClient';
const IMPORTANCE = {
    min: Notifications.AndroidImportance.MIN,
    low: Notifications.AndroidImportance.LOW,
    default: Notifications.AndroidImportance.DEFAULT,
    high: Notifications.AndroidImportance.HIGH,
    max: Notifications.AndroidImportance.MAX,
};
function rawFromExpo(notification) {
    const { content } = notification.request;
    return {
        title: content.title,
        body: content.body,
        data: content.data,
        categoryIdentifier: content.categoryIdentifier,
    };
}
function rawResponseFromExpo(response) {
    return { notification: rawFromExpo(response.notification) };
}
function toExpoTrigger(trigger, channelId) {
    if (trigger.kind === 'date') {
        return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger.date, channelId };
    }
    return {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: trigger.seconds,
        channelId,
    };
}
// expo's notification handler is a process-wide singleton, so which handler is
// installed is process-wide state too -- not per platform instance. It is what
// lets a stale owner's teardown recognise that it no longer owns the handler.
let installedForegroundHandler = null;
export function createExpoPlatform() {
    return {
        os: Platform.OS,
        async getPermissionStatus() {
            return (await Notifications.getPermissionsAsync()).status;
        },
        async requestPermission() {
            return (await Notifications.requestPermissionsAsync()).status;
        },
        getProjectId() {
            // Same lookup expo's own getExpoPushTokenAsync falls back on.
            return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        },
        async getExpoPushToken(projectId) {
            const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
            return data || null;
        },
        addPushTokenListener(listener) {
            const subscription = Notifications.addPushTokenListener(() => listener());
            return () => subscription.remove();
        },
        async setChannel(id, config) {
            await Notifications.setNotificationChannelAsync(id, {
                name: config.name,
                importance: IMPORTANCE[config.importance],
                sound: config.sound,
                enableVibrate: config.vibrate,
            });
        },
        async deleteChannel(id) {
            await Notifications.deleteNotificationChannelAsync(id);
        },
        setForegroundHandler(handler) {
            installedForegroundHandler = handler;
            Notifications.setNotificationHandler({
                // expo gives this 3 seconds to resolve before it drops the
                // notification -- the handler is synchronous specifically so a
                // caller can't blow that budget with an awaited call of their own.
                handleNotification: async (notification) => {
                    const presentation = handler(rawFromExpo(notification));
                    return {
                        shouldShowBanner: presentation.showBanner,
                        shouldShowList: presentation.showBanner,
                        // Only reaches the OS's own alert-sound behavior for a
                        // backgrounded app -- a genuinely foregrounded banner needs the
                        // caller's OWN sound playback (triggered from a subscriber),
                        // since this flag alone isn't guaranteed to do anything while
                        // the app is frontmost.
                        shouldPlaySound: presentation.playSound,
                        shouldSetBadge: presentation.updateBadge,
                    };
                },
            });
            return () => {
                if (installedForegroundHandler !== handler)
                    return;
                installedForegroundHandler = null;
                Notifications.setNotificationHandler(null);
            };
        },
        schedule(request) {
            return Notifications.scheduleNotificationAsync({
                content: {
                    title: request.title,
                    body: request.body,
                    data: request.data,
                    categoryIdentifier: request.categoryIdentifier,
                    sound: request.sound,
                },
                trigger: toExpoTrigger(request.trigger, request.channelId),
            });
        },
        async cancel(id) {
            await Notifications.cancelScheduledNotificationAsync(id);
        },
        async cancelAll() {
            await Notifications.cancelAllScheduledNotificationsAsync();
        },
        addResponseListener(listener) {
            const subscription = Notifications.addNotificationResponseReceivedListener((response) => listener(rawResponseFromExpo(response)));
            return () => subscription.remove();
        },
        getLastResponse() {
            const response = Notifications.getLastNotificationResponse();
            return response ? rawResponseFromExpo(response) : null;
        },
        clearLastResponse() {
            Notifications.clearLastNotificationResponse();
        },
    };
}
/** The client apps actually construct: a PushNotificationClient on the real
 * expo-notifications platform. */
export function createExpoPushClient(options = {}) {
    return new PushNotificationClient({ ...options, platform: createExpoPlatform() });
}
