import { describe, expect, it } from 'vitest';

import { ChannelRegistry } from './ChannelRegistry';
import { LocalNotifier } from './LocalNotifier';
import { FakePushPlatform } from './testing';
import { UnknownCategoryError } from './types';
import type { NotificationCategory } from './types';

const CHIME: NotificationCategory = {
  id: 'chime',
  displayName: 'Chime',
  importance: 'high',
  sound: 'push_notify.wav',
};
const QUIET: NotificationCategory = { id: 'quiet', displayName: 'Quiet', importance: 'low' };
const LOUD: NotificationCategory = { id: 'loud', displayName: 'Loud', importance: 'max', sound: 'default' };

function setup(os = 'ios') {
  const platform = new FakePushPlatform(os);
  const channels = new ChannelRegistry(platform, [CHIME, QUIET, LOUD]);
  return { platform, notifier: new LocalNotifier(platform, channels) };
}

describe('LocalNotifier.schedule', () => {
  it('schedules an interval notification and returns the platform id', async () => {
    const { platform, notifier } = setup();
    const id = await notifier.schedule({
      categoryId: 'chime',
      title: 'Hello',
      body: 'World',
      trigger: { secondsFromNow: 5 },
    });
    expect(id).toBe(platform.scheduled[0]?.id);
    expect(platform.scheduled[0]?.request).toEqual({
      title: 'Hello',
      body: 'World',
      data: { categoryId: 'chime' },
      categoryIdentifier: 'chime',
      sound: 'push_notify.wav',
      trigger: { kind: 'interval', seconds: 5 },
      channelId: 'chime',
    });
  });

  it('passes an absolute Date trigger through untouched', async () => {
    const { platform, notifier } = setup();
    const date = new Date('2026-10-01T09:00:00Z');
    await notifier.schedule({ categoryId: 'chime', title: 't', body: 'b', trigger: date });
    expect(platform.scheduled[0]?.request.trigger).toEqual({ kind: 'date', date });
  });

  it("maps the category sound 'default' to the platform's bare `true`", async () => {
    const { platform, notifier } = setup();
    await notifier.schedule({ categoryId: 'loud', title: 't', body: 'b', trigger: { secondsFromNow: 1 } });
    expect(platform.scheduled[0]?.request.sound).toBe(true);
  });

  it('leaves the sound unspecified for a category without one', async () => {
    const { platform, notifier } = setup();
    await notifier.schedule({ categoryId: 'quiet', title: 't', body: 'b', trigger: { secondsFromNow: 1 } });
    expect(platform.scheduled[0]?.request.sound).toBeUndefined();
  });

  it("stamps categoryId into the data and lets the caller's own data through", async () => {
    const { platform, notifier } = setup();
    await notifier.schedule({
      categoryId: 'chime',
      title: 't',
      body: 'b',
      data: { screen: 'guests' },
      trigger: { secondsFromNow: 1 },
    });
    expect(platform.scheduled[0]?.request.data).toEqual({ screen: 'guests', categoryId: 'chime' });
  });

  it('never lets caller data override the stamped categoryId', async () => {
    const { platform, notifier } = setup();
    await notifier.schedule({
      categoryId: 'chime',
      title: 't',
      body: 'b',
      data: { categoryId: 'spoofed' },
      trigger: { secondsFromNow: 1 },
    });
    expect(platform.scheduled[0]?.request.data.categoryId).toBe('chime');
  });

  it('creates the Android channel before scheduling', async () => {
    const { platform, notifier } = setup('android');
    await notifier.schedule({ categoryId: 'chime', title: 't', body: 'b', trigger: { secondsFromNow: 1 } });
    expect(platform.channels.get('chime')).toMatchObject({ sound: 'push_notify' });
  });

  it('rejects an unregistered category and schedules nothing', async () => {
    const { platform, notifier } = setup();
    await expect(
      notifier.schedule({ categoryId: 'nope', title: 't', body: 'b', trigger: { secondsFromNow: 1 } }),
    ).rejects.toBeInstanceOf(UnknownCategoryError);
    expect(platform.scheduled).toEqual([]);
  });

  it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])('rejects a delay of %s seconds', async (seconds) => {
    const { platform, notifier } = setup();
    await expect(
      notifier.schedule({ categoryId: 'chime', title: 't', body: 'b', trigger: { secondsFromNow: seconds } }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(platform.scheduled).toEqual([]);
    expect(platform.channels.size).toBe(0);
  });
});

describe('LocalNotifier cancel', () => {
  it('cancels one and cancels all', async () => {
    const { platform, notifier } = setup();
    await notifier.cancel('local-9');
    await notifier.cancelAll();
    expect(platform.cancelled).toEqual(['local-9']);
    expect(platform.cancelledAll).toBe(1);
  });
});
