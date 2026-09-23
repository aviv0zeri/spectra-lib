import { describe, expect, it, vi } from 'vitest';

import { ExpoPushProvider } from './ExpoPushProvider';
import type { PushTokenProvider } from './ExpoPushProvider';
import { PushNotificationClient } from './PushNotificationClient';
import { FakePushPlatform } from './testing';

const CATEGORY = { id: 'default', displayName: 'Default', importance: 'default' as const };

describe('PushNotificationClient', () => {
  it('constructs without touching the OS', () => {
    const platform = new FakePushPlatform('android');
    new PushNotificationClient({ platform, categories: [CATEGORY] });
    expect(platform.permissionRequests).toBe(0);
    expect(platform.channels.size).toBe(0);
    expect(platform.hasForegroundHandler).toBe(false);
  });

  it('wires every part to the same platform and category registry', async () => {
    const platform = new FakePushPlatform('android');
    const client = new PushNotificationClient({ platform, categories: [CATEGORY] });
    await client.local.schedule({ categoryId: 'default', title: 't', body: 'b', trigger: { secondsFromNow: 2 } });
    expect(platform.scheduled).toHaveLength(1);
    expect(platform.channels.has('default')).toBe(true);
    expect(client.channels.get('default')).toBe(CATEGORY);
  });

  it('shares one category registry with the local notifier, including categories added later', async () => {
    const platform = new FakePushPlatform();
    const client = new PushNotificationClient({ platform });
    client.channels.register(CATEGORY);
    await expect(
      client.local.schedule({ categoryId: 'default', title: 't', body: 'b', trigger: { secondsFromNow: 2 } }),
    ).resolves.toEqual(expect.any(String));
  });

  it('defaults to the Expo relay provider', () => {
    const client = new PushNotificationClient({ platform: new FakePushPlatform() });
    expect(client.provider).toBeInstanceOf(ExpoPushProvider);
    expect(client.provider.id).toBe('expo');
  });

  it('accepts a different token provider', async () => {
    const custom: PushTokenProvider = {
      id: 'fcm',
      register: async () => ({ provider: 'fcm', value: 'fcm-token', obtainedAt: 'now' }),
      unregister: async () => undefined,
      onRefresh: () => () => undefined,
    };
    const platform = new FakePushPlatform();
    platform.permission = 'granted';
    const client = new PushNotificationClient({ platform, provider: custom });
    expect((await client.enable()).token?.provider).toBe('fcm');
  });

  it('applies the foreground policy and deep-link resolver from its options', async () => {
    const platform = new FakePushPlatform();
    const client = new PushNotificationClient({
      platform,
      foregroundPolicy: () => ({ showBanner: true, playSound: false, updateBadge: false }),
      deepLinkResolver: () => ({ screen: 'Home' }),
    });
    client.foreground.start();
    expect(platform.deliverForeground({ title: 't', body: 'b' })?.showBanner).toBe(true);
    const handler = vi.fn();
    client.deepLinks.onTap(handler);
    platform.tap({ title: 't' });
    expect(handler).toHaveBeenCalledWith({ screen: 'Home' });
  });

  it('keeps two clients fully independent', () => {
    const a = new PushNotificationClient({ platform: new FakePushPlatform(), categories: [CATEGORY] });
    const b = new PushNotificationClient({ platform: new FakePushPlatform() });
    expect(a.channels.list()).toHaveLength(1);
    expect(b.channels.list()).toHaveLength(0);
  });
});

describe('PushNotificationClient.enable', () => {
  it('asks for permission, then returns the granted token', async () => {
    const platform = new FakePushPlatform();
    const client = new PushNotificationClient({ platform });
    const result = await client.enable();
    expect(result.permission).toBe('granted');
    expect(result.token).toMatchObject({ provider: 'expo', value: 'ExponentPushToken[fake]' });
    expect(platform.permissionRequests).toBe(1);
  });

  it('does not even ask the provider for a token when permission was not granted', async () => {
    const platform = new FakePushPlatform();
    platform.answerToRequest = 'denied';
    const register = vi.fn(async () => ({ provider: 'fcm' as const, value: 'v', obtainedAt: 'now' }));
    const provider: PushTokenProvider = {
      id: 'fcm',
      register,
      unregister: async () => undefined,
      onRefresh: () => () => undefined,
    };
    const result = await new PushNotificationClient({ platform, provider }).enable();
    expect(result).toEqual({ permission: 'denied', token: null });
    expect(register).not.toHaveBeenCalled();
  });

  it('returns no token when the user says no', async () => {
    const platform = new FakePushPlatform();
    platform.answerToRequest = 'denied';
    const result = await new PushNotificationClient({ platform }).enable();
    expect(result).toEqual({ permission: 'denied', token: null });
  });

  it('does not prompt again if permission is already granted', async () => {
    const platform = new FakePushPlatform();
    platform.permission = 'granted';
    await new PushNotificationClient({ platform }).enable();
    expect(platform.permissionRequests).toBe(0);
  });

  it('never re-prompts after a denial', async () => {
    const platform = new FakePushPlatform();
    platform.permission = 'denied';
    const result = await new PushNotificationClient({ platform }).enable();
    expect(result).toEqual({ permission: 'denied', token: null });
    expect(platform.permissionRequests).toBe(0);
  });

  it('returns permission granted with a null token when no token can be had', async () => {
    const platform = new FakePushPlatform();
    platform.projectId = undefined;
    const result = await new PushNotificationClient({ platform }).enable();
    expect(result).toEqual({ permission: 'granted', token: null });
  });
});
