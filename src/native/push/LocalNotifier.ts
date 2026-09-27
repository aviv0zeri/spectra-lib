/**
 * LOCAL notifications -- scheduled entirely on-device, no push token or
 * server involved. A local notification takes exactly the path a remote push
 * takes once it reaches the device (same foreground handler, same tap
 * routing), which is why this is also the way to exercise that path on a
 * simulator that can't receive real remote pushes.
 */
import type { ChannelRegistry } from './ChannelRegistry';
import type { PlatformScheduleRequest, PlatformTrigger, PushPlatform } from './platform';

export interface LocalNotificationRequest {
  /** Must be a category registered with the ChannelRegistry. */
  categoryId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** When to fire -- an absolute Date, or a delay in seconds from now. */
  trigger: Date | { secondsFromNow: number };
}

function toTrigger(trigger: LocalNotificationRequest['trigger']): PlatformTrigger {
  if (trigger instanceof Date) return { kind: 'date', date: trigger };
  const seconds = trigger.secondsFromNow;
  // The OS rejects a non-positive interval with an opaque native error;
  // failing here names the actual mistake.
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new RangeError(`secondsFromNow must be a positive number, got ${seconds}`);
  }
  return { kind: 'interval', seconds };
}

/** NotificationCategory.sound's 'default' is this tree's own convention (the
 * iOS sound-name / channel convention) -- the platform's scheduling API wants
 * a bare `true` for "play the default sound." */
function contentSound(sound: string | undefined): boolean | string | undefined {
  if (sound === undefined) return undefined;
  return sound === 'default' ? true : sound;
}

export class LocalNotifier {
  constructor(
    private readonly platform: PushPlatform,
    private readonly channels: ChannelRegistry,
  ) {}

  /**
   * Schedules one local notification and returns an id usable with cancel().
   * Throws UnknownCategoryError if the category was never registered, and
   * RangeError for a non-positive delay.
   */
  async schedule(request: LocalNotificationRequest): Promise<string> {
    const category = this.channels.require(request.categoryId);
    const trigger = toTrigger(request.trigger);
    await this.channels.ensure(category.id);

    const scheduled: PlatformScheduleRequest = {
      title: request.title,
      body: request.body,
      // Stamped alongside the caller's own data so a fired local notification
      // resolves through the same categoryId convention as a remote push (see
      // internal/notification.ts). Last, so a caller can't override it --
      // categoryIdentifier below is only the iOS fallback path.
      data: { ...request.data, categoryId: category.id },
      categoryIdentifier: category.id,
      sound: contentSound(category.sound),
      trigger,
      channelId: category.id,
    };
    return this.platform.schedule(scheduled);
  }

  cancel(id: string): Promise<void> {
    return this.platform.cancel(id);
  }

  cancelAll(): Promise<void> {
    return this.platform.cancelAll();
  }
}
