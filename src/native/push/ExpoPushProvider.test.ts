import { describe, expect, it, vi } from 'vitest';

import { ExpoPushProvider } from './ExpoPushProvider';
import { PermissionManager } from './PermissionManager';
import { FakePushPlatform } from './testing';

const NOW = new Date('2026-09-24T10:00:00.000Z');

function setup(configure?: (platform: FakePushPlatform) => void) {
  const platform = new FakePushPlatform();
  platform.permission = 'granted';
  configure?.(platform);
  const provider = new ExpoPushProvider(platform, new PermissionManager(platform), { now: () => NOW });
  return { platform, provider };
}

describe('ExpoPushProvider.register', () => {
  it('returns an expo token stamped with the clock', async () => {
    const { provider } = setup();
    expect(await provider.register()).toEqual({
      provider: 'expo',
      value: 'ExponentPushToken[fake]',
      obtainedAt: '2026-09-24T10:00:00.000Z',
    });
  });

  it('is null, without prompting, when permission is not granted', async () => {
    const { platform, provider } = setup((p) => (p.permission = 'undetermined'));
    expect(await provider.register()).toBeNull();
    expect(platform.permissionRequests).toBe(0);
  });

  it('is null when the build has no EAS project id', async () => {
    const { provider } = setup((p) => (p.projectId = undefined));
    expect(await provider.register()).toBeNull();
  });

  it('uses an explicitly configured project id when the build has none', async () => {
    const platform = new FakePushPlatform();
    platform.permission = 'granted';
    platform.projectId = undefined;
    const provider = new ExpoPushProvider(platform, new PermissionManager(platform), { projectId: 'p' });
    expect(await provider.register()).not.toBeNull();
  });

  it('prefers the configured project id over the one the build carries', async () => {
    const platform = new FakePushPlatform();
    platform.permission = 'granted';
    platform.projectId = 'from-build';
    const seen: string[] = [];
    platform.getExpoPushToken = async (projectId) => {
      seen.push(projectId);
      return 'ExponentPushToken[x]';
    };
    const provider = new ExpoPushProvider(platform, new PermissionManager(platform), { projectId: 'configured' });
    await provider.register();
    expect(seen).toEqual(['configured']);
  });

  it('is null when the platform yields no token', async () => {
    const { provider } = setup((p) => (p.token = null));
    expect(await provider.register()).toBeNull();
  });

  it('never throws -- a failing token call resolves null', async () => {
    const { provider } = setup((p) => (p.token = new Error('simulator')));
    await expect(provider.register()).resolves.toBeNull();
  });
});

describe('ExpoPushProvider.onRefresh', () => {
  it('re-derives an Expo token on each native change and hands it over', async () => {
    const { platform, provider } = setup();
    const handler = vi.fn();
    provider.onRefresh(handler);
    platform.changeToken();
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ provider: 'expo', value: 'ExponentPushToken[fake]' });
  });

  it('stays quiet when no token can be derived', async () => {
    const { platform, provider } = setup((p) => (p.token = null));
    const handler = vi.fn();
    provider.onRefresh(handler);
    platform.changeToken();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call the handler for a change still resolving when it unsubscribed', async () => {
    const { platform, provider } = setup();
    const handler = vi.fn();
    const unsubscribe = provider.onRefresh(handler);
    platform.changeToken();
    unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(handler).not.toHaveBeenCalled();
  });

  it('detaches the platform listener when unsubscribed, not just silences the handler', async () => {
    const { platform, provider } = setup();
    expect(platform.tokenListenerCount).toBe(0);
    const unsubscribe = provider.onRefresh(vi.fn());
    expect(platform.tokenListenerCount).toBe(1);
    unsubscribe();
    expect(platform.tokenListenerCount).toBe(0);
  });
});

describe('ExpoPushProvider.unregister', () => {
  it('is a documented no-op', async () => {
    const { provider } = setup();
    await expect(
      provider.unregister({ provider: 'expo', value: 'x', obtainedAt: NOW.toISOString() }),
    ).resolves.toBeUndefined();
  });
});
