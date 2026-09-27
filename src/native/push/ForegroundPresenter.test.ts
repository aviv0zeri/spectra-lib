import { describe, expect, it, vi } from 'vitest';

import { ForegroundPresenter, SUPPRESS_ALL } from './ForegroundPresenter';
import { FakePushPlatform } from './testing';

const VISIBLE = { title: 'Gate opened', body: 'Front door', data: { categoryId: 'gate' } };
const SILENT = { data: { categoryId: 'sync' } };

describe('ForegroundPresenter', () => {
  it('installs nothing until started or subscribed to', () => {
    const platform = new FakePushPlatform();
    const presenter = new ForegroundPresenter(platform);
    expect(platform.hasForegroundHandler).toBe(false);
    expect(presenter.running).toBe(false);
    presenter.start();
    expect(platform.hasForegroundHandler).toBe(true);
    expect(presenter.running).toBe(true);
  });

  describe('subscribing starts the presenter', () => {
    it('so a subscriber never silently waits on a start() nobody called', () => {
      const platform = new FakePushPlatform();
      const presenter = new ForegroundPresenter(platform);
      const listener = vi.fn();
      presenter.subscribe(listener);
      expect(presenter.running).toBe(true);
      platform.deliverForeground(VISIBLE);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('and the last unsubscribe stops it again', () => {
      const platform = new FakePushPlatform();
      const presenter = new ForegroundPresenter(platform);
      const first = presenter.subscribe(() => undefined);
      const second = presenter.subscribe(() => undefined);
      first();
      expect(presenter.running).toBe(true);
      second();
      expect(presenter.running).toBe(false);
      expect(platform.hasForegroundHandler).toBe(false);
    });

    it('but an explicit start() keeps it running after the last unsubscribe', () => {
      const platform = new FakePushPlatform();
      const presenter = new ForegroundPresenter(platform);
      presenter.start();
      presenter.subscribe(() => undefined)();
      expect(presenter.running).toBe(true);
    });

    it('and a start() after subscribing also makes it stick', () => {
      const platform = new FakePushPlatform();
      const presenter = new ForegroundPresenter(platform);
      const unsubscribe = presenter.subscribe(() => undefined);
      presenter.start();
      unsubscribe();
      expect(presenter.running).toBe(true);
    });

    it('and stop() clears the explicit flag so a later subscription is auto again', () => {
      const platform = new FakePushPlatform();
      const presenter = new ForegroundPresenter(platform);
      presenter.start();
      presenter.stop();
      presenter.subscribe(() => undefined)();
      expect(presenter.running).toBe(false);
    });
  });

  describe('dispatch is over a snapshot of the subscribers', () => {
    it('a subscriber that unsubscribes itself does not skip the next one', () => {
      const platform = new FakePushPlatform();
      const presenter = new ForegroundPresenter(platform);
      const second = vi.fn();
      const unsubscribeFirst = presenter.subscribe(() => unsubscribeFirst());
      presenter.subscribe(second);
      platform.deliverForeground(VISIBLE);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('a subscriber added during dispatch waits for the next event', () => {
      const platform = new FakePushPlatform();
      const presenter = new ForegroundPresenter(platform);
      const late = vi.fn();
      let added = false;
      presenter.subscribe(() => {
        if (!added) {
          added = true;
          presenter.subscribe(late);
        }
      });
      platform.deliverForeground(VISIBLE);
      expect(late).not.toHaveBeenCalled();
      platform.deliverForeground(VISIBLE);
      expect(late).toHaveBeenCalledTimes(1);
    });
  });

  it('defaults to showing nothing (the OS default)', () => {
    const platform = new FakePushPlatform();
    new ForegroundPresenter(platform).start();
    expect(platform.deliverForeground(VISIBLE)).toEqual(SUPPRESS_ALL);
  });

  it('answers the OS with whatever the policy decides', () => {
    const platform = new FakePushPlatform();
    const policy = vi.fn(() => ({ showBanner: true, playSound: true, updateBadge: false }));
    new ForegroundPresenter(platform, policy).start();
    expect(platform.deliverForeground(VISIBLE)).toEqual({ showBanner: true, playSound: true, updateBadge: false });
    expect(policy).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'gate', title: 'Gate opened' }));
  });

  it('lets the policy be swapped while running', () => {
    const platform = new FakePushPlatform();
    const presenter = new ForegroundPresenter(platform);
    presenter.start();
    presenter.setPolicy(() => ({ showBanner: true, playSound: false, updateBadge: true }));
    expect(platform.deliverForeground(VISIBLE)).toEqual({ showBanner: true, playSound: false, updateBadge: true });
  });

  it('never shows a silent event to subscribers or the policy', () => {
    const platform = new FakePushPlatform();
    const policy = vi.fn(() => ({ showBanner: true, playSound: true, updateBadge: true }));
    const presenter = new ForegroundPresenter(platform, policy);
    const listener = vi.fn();
    presenter.subscribe(listener);
    presenter.start();
    expect(platform.deliverForeground(SILENT)).toEqual(SUPPRESS_ALL);
    expect(listener).not.toHaveBeenCalled();
    expect(policy).not.toHaveBeenCalled();
  });

  it('tells every subscriber about a visible arrival, before the policy answers', () => {
    const platform = new FakePushPlatform();
    const order: string[] = [];
    const presenter = new ForegroundPresenter(platform, () => {
      order.push('policy');
      return SUPPRESS_ALL;
    });
    const a = vi.fn(() => order.push('a'));
    const b = vi.fn(() => order.push('b'));
    presenter.subscribe(a);
    presenter.subscribe(b);
    presenter.start();
    platform.deliverForeground(VISIBLE);
    expect(a).toHaveBeenCalledWith(expect.objectContaining({ title: 'Gate opened' }));
    expect(b).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['a', 'b', 'policy']);
  });

  it('stops telling a subscriber that unsubscribed', () => {
    const platform = new FakePushPlatform();
    const presenter = new ForegroundPresenter(platform);
    const listener = vi.fn();
    presenter.subscribe(listener)();
    presenter.start();
    platform.deliverForeground(VISIBLE);
    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a throwing subscriber from the others and from the policy', () => {
    const platform = new FakePushPlatform();
    const policy = vi.fn(() => ({ showBanner: true, playSound: false, updateBadge: false }));
    const presenter = new ForegroundPresenter(platform, policy);
    const good = vi.fn();
    presenter.subscribe(() => {
      throw new Error('subscriber bug');
    });
    presenter.subscribe(good);
    presenter.start();
    expect(platform.deliverForeground(VISIBLE)?.showBanner).toBe(true);
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('falls back to showing nothing if the policy throws', () => {
    const platform = new FakePushPlatform();
    new ForegroundPresenter(platform, () => {
      throw new Error('policy bug');
    }).start();
    expect(platform.deliverForeground(VISIBLE)).toEqual(SUPPRESS_ALL);
  });

  it('start() is idempotent and stop() removes the handler', () => {
    const platform = new FakePushPlatform();
    const presenter = new ForegroundPresenter(platform);
    presenter.start();
    presenter.start();
    presenter.stop();
    expect(platform.hasForegroundHandler).toBe(false);
    expect(presenter.running).toBe(false);
    presenter.stop();
  });

  it('can be started again after stopping', () => {
    const platform = new FakePushPlatform();
    const presenter = new ForegroundPresenter(platform);
    presenter.start();
    presenter.stop();
    presenter.start();
    expect(platform.hasForegroundHandler).toBe(true);
  });

  it("a stale presenter's stop() never wipes a newer presenter's handler", () => {
    const platform = new FakePushPlatform();
    const older = new ForegroundPresenter(platform);
    const newer = new ForegroundPresenter(platform, () => ({ showBanner: true, playSound: false, updateBadge: false }));
    older.start();
    newer.start();
    older.stop();
    expect(platform.hasForegroundHandler).toBe(true);
    expect(platform.deliverForeground(VISIBLE)?.showBanner).toBe(true);
  });
});
