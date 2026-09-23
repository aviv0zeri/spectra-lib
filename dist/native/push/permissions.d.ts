import type { PermissionStatus } from './types';
export declare function getPermissionStatus(): Promise<PermissionStatus>;
/**
 * Prompts the user if not already asked; a no-op returning the current
 * status if already resolved. iOS shows its permission dialog exactly once
 * per install -- calling requestPermissionsAsync again after a denial
 * doesn't re-prompt, it just silently resolves 'denied' again, so treating
 * that as "nothing to do" here rather than issuing a fresh request keeps
 * the caller from burning that one prompt by accident on an unrelated retry.
 */
export declare function requestPermission(): Promise<PermissionStatus>;
