import type { NotificationEvent } from './types';
/**
 * Registers the given async handler for silent/background events, for as
 * long as the returned unsubscribe function isn't called. The consuming
 * project owns what the handler actually does (refetch, update a local
 * cache, ...); this function's job is wiring it to the native task and
 * enforcing the completion-budget contract above.
 */
export declare function setBackgroundHandler(handler: (event: NotificationEvent) => Promise<void>): () => void;
