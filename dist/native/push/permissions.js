/**
 * Permission request/status -- iOS UNUserNotificationCenter authorization,
 * Android 13+'s runtime POST_NOTIFICATIONS permission. Built against
 * expo-notifications' own getPermissionsAsync()/requestPermissionsAsync(),
 * which already normalize the Android <13 "never asks, reads as granted"
 * case -- no Platform.OS branch needed here.
 */
import * as Notifications from 'expo-notifications';
function normalizeStatus(status) {
    if (status === 'granted')
        return 'granted';
    if (status === 'denied')
        return 'denied';
    return 'undetermined';
}
export async function getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return normalizeStatus(status);
}
/**
 * Prompts the user if not already asked; a no-op returning the current
 * status if already resolved. iOS shows its permission dialog exactly once
 * per install -- calling requestPermissionsAsync again after a denial
 * doesn't re-prompt, it just silently resolves 'denied' again, so treating
 * that as "nothing to do" here rather than issuing a fresh request keeps
 * the caller from burning that one prompt by accident on an unrelated retry.
 */
export async function requestPermission() {
    const current = await getPermissionStatus();
    if (current !== 'undetermined')
        return current;
    const { status } = await Notifications.requestPermissionsAsync();
    return normalizeStatus(status);
}
