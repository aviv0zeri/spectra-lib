/**
 * A push is "silent" (data-only, no user-visible alert) when the sender
 * marked it explicitly (`data.silent`) or the delivered content has neither
 * a title nor a body -- APNs `content-available` and FCM data messages both
 * arrive this way when they carry no `alert`/`notification` block.
 */
function isSilent(raw) {
    if (raw.data?.silent === true)
        return true;
    return !raw.title && !raw.body;
}
/**
 * There's no cross-platform field for "which NotificationCategory is this,"
 * so this tree's own convention (documented on types.ts's NotificationEvent)
 * is that the sender includes `categoryId` in the payload's data -- the iOS
 * `categoryIdentifier` is a fallback for a push that only set that.
 */
function extractCategoryId(raw) {
    const fromData = raw.data?.categoryId;
    if (typeof fromData === 'string')
        return fromData;
    return raw.categoryIdentifier ?? '';
}
export function toNotificationEvent(raw) {
    return {
        categoryId: extractCategoryId(raw),
        title: raw.title ?? '',
        body: raw.body ?? '',
        data: raw.data ?? {},
        silent: isSilent(raw),
    };
}
