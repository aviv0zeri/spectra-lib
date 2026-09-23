import { describe, expect, it, vi } from 'vitest';

import { DeepLinkRouter } from './DeepLinkRouter';
import type { DeepLinkResolver } from './DeepLinkRouter';
import { FakePushPlatform } from './testing';

const GUESTS: DeepLinkResolver = (event) =>
  event.categoryId === 'invite' ? { screen: 'Guests', params: { title: event.title } } : null;

const INVITE_TAP = { title: 'New guest', body: 'b', data: { categoryId: 'invite' } };
const OTHER_TAP = { title: 'Other', body: 'b', data: { categoryId: 'other' } };

describe('DeepLinkRouter.getLaunchTarget (cold start)', () => {
  it('resolves the tap that launched the app', async () => {
    const platform = new FakePushPlatform();
    platform.launchFromTap(INVITE_TAP);
    const router = new DeepLinkRouter(platform, GUESTS);
    expect(await router.getLaunchTarget()).toEqual({ screen: 'Guests', params: { title: 'New guest' } });
  });

  it('is null when the app was not launched by a notification', async () => {
    expect(await new DeepLinkRouter(new FakePushPlatform(), GUESTS).getLaunchTarget()).toBeNull();
  });

  it('replays the launch tap only once', async () => {
    const platform = new FakePushPlatform();
    platform.launchFromTap(INVITE_TAP);
    const router = new DeepLinkRouter(platform, GUESTS);
    await router.getLaunchTarget();
    expect(await router.getLaunchTarget()).toBeNull();
  });

  it('is null when the resolver maps the tap to nowhere', async () => {
    const platform = new FakePushPlatform();
    platform.launchFromTap(OTHER_TAP);
    expect(await new DeepLinkRouter(platform, GUESTS).getLaunchTarget()).toBeNull();
  });

  it('is null without a resolver, and leaves the tap for a later call', async () => {
    const platform = new FakePushPlatform();
    platform.launchFromTap(INVITE_TAP);
    const router = new DeepLinkRouter(platform);
    expect(await router.getLaunchTarget()).toBeNull();
    expect(platform.getLastResponse()).not.toBeNull();
    router.setResolver(GUESTS);
    expect(await router.getLaunchTarget()).toEqual({ screen: 'Guests', params: { title: 'New guest' } });
    expect(platform.getLastResponse()).toBeNull();
  });
});

describe('DeepLinkRouter.onTap (already running)', () => {
  it('hands the handler the resolved target', () => {
    const platform = new FakePushPlatform();
    const handler = vi.fn();
    new DeepLinkRouter(platform, GUESTS).onTap(handler);
    platform.tap(INVITE_TAP);
    expect(handler).toHaveBeenCalledWith({ screen: 'Guests', params: { title: 'New guest' } });
  });

  it('skips a tap the resolver maps to nowhere', () => {
    const platform = new FakePushPlatform();
    const handler = vi.fn();
    new DeepLinkRouter(platform, GUESTS).onTap(handler);
    platform.tap(OTHER_TAP);
    expect(handler).not.toHaveBeenCalled();
  });

  it('picks up a resolver set after the subscription was made', () => {
    const platform = new FakePushPlatform();
    const handler = vi.fn();
    const router = new DeepLinkRouter(platform);
    router.onTap(handler);
    platform.tap(INVITE_TAP);
    expect(handler).not.toHaveBeenCalled();
    router.setResolver(GUESTS);
    platform.tap(INVITE_TAP);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stops after unsubscribing', () => {
    const platform = new FakePushPlatform();
    const handler = vi.fn();
    new DeepLinkRouter(platform, GUESTS).onTap(handler)();
    platform.tap(INVITE_TAP);
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps each router’s resolver to itself', () => {
    const platform = new FakePushPlatform();
    const a = vi.fn();
    const b = vi.fn();
    new DeepLinkRouter(platform, () => ({ screen: 'A' })).onTap(a);
    new DeepLinkRouter(platform, () => ({ screen: 'B' })).onTap(b);
    platform.tap(INVITE_TAP);
    expect(a).toHaveBeenCalledWith({ screen: 'A' });
    expect(b).toHaveBeenCalledWith({ screen: 'B' });
  });
});
