import { describe, expect, it } from 'vitest';

import { ChannelRegistry, androidSoundName } from './ChannelRegistry';
import { FakePushPlatform } from './testing';
import { UnknownCategoryError } from './types';
import type { NotificationCategory } from './types';

const INVITE: NotificationCategory = {
  id: 'invite',
  displayName: 'Invites',
  importance: 'high',
  sound: 'push_notify.wav',
  vibrate: true,
};
const PAYMENT: NotificationCategory = { id: 'payment', displayName: 'Payments', importance: 'default' };

describe('androidSoundName', () => {
  it('strips the extension Android channels do not want', () => {
    expect(androidSoundName('push_notify.wav')).toBe('push_notify');
    expect(androidSoundName('a.b.wav')).toBe('a.b');
  });

  it('passes "default" through and treats absent/empty as no sound', () => {
    expect(androidSoundName('default')).toBe('default');
    expect(androidSoundName(undefined)).toBeUndefined();
    expect(androidSoundName('')).toBeUndefined();
  });
});

describe('ChannelRegistry', () => {
  it('registers categories, looks them up and lists them', () => {
    const registry = new ChannelRegistry(new FakePushPlatform('android'), [INVITE]).register(PAYMENT);
    expect(registry.get('invite')).toBe(INVITE);
    expect(registry.list().map((c) => c.id)).toEqual(['invite', 'payment']);
  });

  it('replaces a category registered again under the same id', () => {
    const registry = new ChannelRegistry(new FakePushPlatform('android'), [INVITE]);
    const updated = { ...INVITE, displayName: 'Guest invites' };
    registry.register(updated);
    expect(registry.list()).toHaveLength(1);
    expect(registry.get('invite')?.displayName).toBe('Guest invites');
  });

  it('require() throws UnknownCategoryError naming the missing id', () => {
    const registry = new ChannelRegistry(new FakePushPlatform('android'));
    expect(() => registry.require('nope')).toThrow(UnknownCategoryError);
    expect(() => registry.require('nope')).toThrow(/"nope"/);
  });

  it('creates one Android channel per category on sync(), with the extension stripped', async () => {
    const platform = new FakePushPlatform('android');
    await new ChannelRegistry(platform, [INVITE, PAYMENT]).sync();
    expect(platform.channels.get('invite')).toEqual({
      name: 'Invites',
      importance: 'high',
      sound: 'push_notify',
      vibrate: true,
    });
    expect(platform.channels.get('payment')).toMatchObject({ name: 'Payments', importance: 'default' });
  });

  it('ensure() creates just the one channel', async () => {
    const platform = new FakePushPlatform('android');
    await new ChannelRegistry(platform, [INVITE, PAYMENT]).ensure('payment');
    expect([...platform.channels.keys()]).toEqual(['payment']);
  });

  it('ensure() of an unregistered id throws instead of guessing a channel', async () => {
    const registry = new ChannelRegistry(new FakePushPlatform('android'));
    await expect(registry.ensure('nope')).rejects.toBeInstanceOf(UnknownCategoryError);
  });

  it('touches nothing on iOS -- no channels concept there', async () => {
    const platform = new FakePushPlatform('ios');
    const registry = new ChannelRegistry(platform, [INVITE]);
    await registry.sync();
    await registry.ensure('invite');
    await registry.remove('invite');
    expect(platform.channels.size).toBe(0);
    expect(platform.deletedChannels).toEqual([]);
  });

  it('remove() forgets the category and deletes its Android channel', async () => {
    const platform = new FakePushPlatform('android');
    const registry = new ChannelRegistry(platform, [INVITE]);
    await registry.sync();
    await registry.remove('invite');
    expect(registry.get('invite')).toBeUndefined();
    expect(platform.deletedChannels).toEqual(['invite']);
    expect(platform.channels.has('invite')).toBe(false);
  });
});
