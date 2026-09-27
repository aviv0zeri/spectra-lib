/**
 * The set of NotificationCategory objects a project sends, and their Android
 * NotificationChannels -- one channel per category, so a user can mute
 * "gate activity" without also muting "payment failed". iOS has no channel
 * concept, so every method that touches the OS is a no-op there and callers
 * never need a platform branch of their own.
 *
 * It is also the lookup LocalNotifier uses: a category carries the channel id
 * and sound, so scheduling takes only a category id and asks the registry.
 */
import type { PushPlatform } from './platform';
import { UnknownCategoryError } from './types';
import type { NotificationCategory } from './types';

/**
 * NotificationCategory.sound is documented (types.ts) as a filename WITH
 * extension, matching iOS's convention -- but Android's channel `sound` field
 * wants the raw resource name with no extension. Stripping it here keeps that
 * one field usable from both platforms without pushing the difference onto
 * every caller.
 */
export function androidSoundName(sound: string | undefined): string | undefined {
  if (!sound) return undefined;
  if (sound === 'default') return 'default';
  return sound.replace(/\.[^/.]+$/, '');
}

export class ChannelRegistry {
  private readonly categories = new Map<string, NotificationCategory>();

  constructor(
    private readonly platform: PushPlatform,
    categories: readonly NotificationCategory[] = [],
  ) {
    this.register(...categories);
  }

  /** Adds categories (a category with an already-registered id replaces it).
   * Does not touch the OS -- call sync() or let LocalNotifier.schedule create
   * the channel it needs. */
  register(...categories: NotificationCategory[]): this {
    for (const category of categories) this.categories.set(category.id, category);
    return this;
  }

  get(id: string): NotificationCategory | undefined {
    return this.categories.get(id);
  }

  /** The category, or an UnknownCategoryError naming the id nobody registered. */
  require(id: string): NotificationCategory {
    const category = this.categories.get(id);
    if (!category) throw new UnknownCategoryError(id);
    return category;
  }

  list(): NotificationCategory[] {
    return [...this.categories.values()];
  }

  /** Creates (or updates the mutable fields of) the channel for every
   * registered category. Call once at startup, before any push can arrive. */
  async sync(): Promise<void> {
    await Promise.all(this.list().map((category) => this.push(category)));
  }

  /** Creates (or updates) the channel for one registered category. */
  async ensure(id: string): Promise<void> {
    await this.push(this.require(id));
  }

  /** Forgets the category and deletes its channel -- e.g. a kind of
   * notification the app no longer sends. Already-delivered notifications
   * are unaffected. */
  async remove(id: string): Promise<void> {
    this.categories.delete(id);
    if (this.platform.os !== 'android') return;
    await this.platform.deleteChannel(id);
  }

  private async push(category: NotificationCategory): Promise<void> {
    if (this.platform.os !== 'android') return;
    await this.platform.setChannel(category.id, {
      name: category.displayName,
      importance: category.importance,
      sound: androidSoundName(category.sound),
      vibrate: category.vibrate,
    });
  }
}
