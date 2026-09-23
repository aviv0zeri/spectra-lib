import { describe, expect, it } from 'vitest';

import { PermissionManager, normalizeStatus } from './PermissionManager';
import { FakePushPlatform } from './testing';

describe('normalizeStatus', () => {
  it('maps the two explicit answers and treats everything else as undetermined', () => {
    expect(normalizeStatus('granted')).toBe('granted');
    expect(normalizeStatus('denied')).toBe('denied');
    expect(normalizeStatus('undetermined')).toBe('undetermined');
    expect(normalizeStatus('provisional')).toBe('undetermined');
    expect(normalizeStatus('')).toBe('undetermined');
  });
});

describe('PermissionManager', () => {
  it('reports the platform status, normalized', async () => {
    const platform = new FakePushPlatform();
    platform.permission = 'granted';
    expect(await new PermissionManager(platform).getStatus()).toBe('granted');
  });

  it('prompts when undetermined and returns the answer', async () => {
    const platform = new FakePushPlatform();
    platform.answerToRequest = 'granted';
    const manager = new PermissionManager(platform);
    expect(await manager.request()).toBe('granted');
    expect(platform.permissionRequests).toBe(1);
  });

  it('does not re-prompt once granted', async () => {
    const platform = new FakePushPlatform();
    platform.permission = 'granted';
    expect(await new PermissionManager(platform).request()).toBe('granted');
    expect(platform.permissionRequests).toBe(0);
  });

  it('does not burn the one iOS prompt again after a denial', async () => {
    const platform = new FakePushPlatform();
    platform.permission = 'denied';
    expect(await new PermissionManager(platform).request()).toBe('denied');
    expect(platform.permissionRequests).toBe(0);
  });

  it('shares one prompt between concurrent callers', async () => {
    const platform = new FakePushPlatform();
    const manager = new PermissionManager(platform);
    const [a, b, c] = await Promise.all([manager.request(), manager.request(), manager.request()]);
    expect([a, b, c]).toEqual(['granted', 'granted', 'granted']);
    expect(platform.permissionRequests).toBe(1);
  });

  it('can prompt again on a later call once the first has settled', async () => {
    const platform = new FakePushPlatform();
    platform.answerToRequest = 'undetermined';
    const manager = new PermissionManager(platform);
    await manager.request();
    await manager.request();
    expect(platform.permissionRequests).toBe(2);
  });
});
