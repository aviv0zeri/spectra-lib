import { describe, expect, it, vi } from 'vitest';

import { PushNotificationClient } from '../push/PushNotificationClient';
import { FakePushPlatform } from '../push/testing';
import { PushTesterController } from './PushTesterController';
import type { PushTesterClient } from './PushTesterController';

const CATEGORY = { id: 'default', displayName: 'Default', importance: 'default' as const, sound: 'push_notify.wav' };
const AT = new Date('2026-09-24T10:30:00Z');

function setup(configure?: (platform: FakePushPlatform) => void, maxSent?: number) {
  const platform = new FakePushPlatform();
  configure?.(platform);
  const client = new PushNotificationClient({ platform, categories: [CATEGORY] });
  const controller = new PushTesterController(client, {
    categoryId: 'default',
    defaultTitle: 'Test title',
    defaultBody: 'Test body',
    now: () => AT,
    formatTime: (date) => date.toISOString().slice(11, 16),
    maxSent,
  });
  return { platform, client, controller };
}

describe('PushTesterController state', () => {
  it('starts with the defaults and nothing known yet', () => {
    const { controller } = setup();
    expect(controller.getState()).toEqual({
      title: 'Test title',
      body: 'Test body',
      permission: null,
      token: undefined,
      status: null,
      sent: [],
    });
  });

  it('returns a new state object on every change and none when nothing changed', () => {
    const { controller } = setup();
    const before = controller.getState();
    expect(controller.getState()).toBe(before);
    controller.setTitle('Other');
    expect(controller.getState()).not.toBe(before);
    expect(before.title).toBe('Test title');
  });

  it('notifies subscribers on change, and stops after unsubscribe', () => {
    const { controller } = setup();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.setBody('x');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    controller.setBody('y');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('PushTesterController permission', () => {
  it('init() reads the current permission', async () => {
    const { controller } = setup((p) => (p.permission = 'granted'));
    await controller.init();
    expect(controller.getState().permission).toBe('granted');
  });

  it("init() reports 'unavailable' when the OS can't say", async () => {
    const client: PushTesterClient = {
      permissions: { getStatus: () => Promise.reject(new Error('boom')), request: async () => 'denied' },
      provider: { register: async () => null },
      local: { schedule: async () => '' },
    };
    const controller = new PushTesterController(client, { categoryId: 'c', defaultTitle: '', defaultBody: '' });
    await controller.init();
    expect(controller.getState().permission).toBe('unavailable');
  });

  it('drops an init() result that lands after dispose()', async () => {
    const { controller } = setup((p) => (p.permission = 'granted'));
    const pending = controller.init();
    controller.dispose();
    await pending;
    expect(controller.getState().permission).toBeNull();
  });

  it('can be initialised again after dispose (StrictMode double-mount)', async () => {
    const { controller } = setup((p) => (p.permission = 'granted'));
    controller.dispose();
    await controller.init();
    expect(controller.getState().permission).toBe('granted');
  });

  it('askPermission() prompts and stores the answer', async () => {
    const { platform, controller } = setup();
    await controller.askPermission();
    expect(controller.getState().permission).toBe('granted');
    expect(platform.permissionRequests).toBe(1);
  });

  it('askPermission() surfaces a failure as data', async () => {
    const client: PushTesterClient = {
      permissions: { getStatus: async () => 'undetermined', request: () => Promise.reject(new Error('x')) },
      provider: { register: async () => null },
      local: { schedule: async () => '' },
    };
    const controller = new PushTesterController(client, { categoryId: 'c', defaultTitle: '', defaultBody: '' });
    await controller.askPermission();
    expect(controller.getState().status).toEqual({ kind: 'permissionFailed' });
  });
});

describe('PushTesterController.send', () => {
  it('schedules the current title/body under the category and records the send', async () => {
    const { platform, controller } = setup((p) => (p.permission = 'granted'));
    controller.setTitle('Hello');
    controller.setBody('World');
    await controller.send(2);
    expect(platform.scheduled).toHaveLength(1);
    expect(platform.scheduled[0]?.request).toMatchObject({
      title: 'Hello',
      body: 'World',
      channelId: 'default',
      trigger: { kind: 'interval', seconds: 2 },
    });
    expect(controller.getState().sent).toEqual([{ id: '0', title: 'Hello', body: 'World', at: '10:30' }]);
    expect(controller.getState().status).toEqual({ kind: 'scheduled', seconds: 2 });
  });

  it('keeps the newest first and caps the list', async () => {
    const { controller } = setup(undefined, 3);
    for (const title of ['a', 'b', 'c', 'd']) {
      controller.setTitle(title);
      await controller.send(2);
    }
    expect(controller.getState().sent.map((s) => s.title)).toEqual(['d', 'c', 'b']);
  });

  it('gives every sent test a distinct id', async () => {
    const { controller } = setup();
    await controller.send(2);
    await controller.send(10);
    const ids = controller.getState().sent.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('reports a scheduling failure as data and does not record a send', async () => {
    const { controller } = setup();
    // 0 seconds is rejected by the notifier with a RangeError.
    await controller.send(0);
    const { status, sent } = controller.getState();
    expect(status).toMatchObject({ kind: 'scheduleFailed' });
    expect(status && 'message' in status ? status.message : '').toMatch(/positive/);
    expect(sent).toEqual([]);
  });

  it('clears the previous status while sending', async () => {
    const { controller } = setup();
    await controller.send(0);
    expect(controller.getState().status?.kind).toBe('scheduleFailed');
    await controller.send(2);
    expect(controller.getState().status).toEqual({ kind: 'scheduled', seconds: 2 });
  });
});

describe('PushTesterController sent-list actions', () => {
  async function withOneSent() {
    const ctx = setup();
    ctx.controller.setTitle('Saved title');
    ctx.controller.setBody('Saved body');
    await ctx.controller.send(2);
    return ctx;
  }

  it('reuse() copies a sent test back into the form', async () => {
    const { controller } = await withOneSent();
    controller.setTitle('changed');
    controller.setBody('changed');
    controller.reuse('0');
    expect(controller.getState()).toMatchObject({ title: 'Saved title', body: 'Saved body' });
  });

  it('reuse() of an unknown id changes nothing', async () => {
    const { controller } = await withOneSent();
    const before = controller.getState();
    controller.reuse('nope');
    expect(controller.getState()).toBe(before);
  });

  it('dismiss() removes just that test', async () => {
    const { controller } = await withOneSent();
    await controller.send(2);
    controller.dismiss('0');
    expect(controller.getState().sent.map((s) => s.id)).toEqual(['1']);
  });

  it('noteTapped() records which test was tapped', async () => {
    const { controller } = await withOneSent();
    controller.noteTapped('0');
    expect(controller.getState().status).toEqual({ kind: 'tapped', title: 'Saved title' });
  });
});

describe('PushTesterController.fetchToken', () => {
  it('stores the token value', async () => {
    const { controller } = setup((p) => (p.permission = 'granted'));
    await controller.fetchToken();
    expect(controller.getState().token).toBe('ExponentPushToken[fake]');
  });

  it('stores null (asked, none available) when no token can be had', async () => {
    const { controller } = setup(); // permission undetermined -> no token
    await controller.fetchToken();
    expect(controller.getState().token).toBeNull();
  });
});

/** A client whose calls the test resolves by hand, to observe in-flight state. */
function manualClient() {
  let resolveSchedule: (id: string) => void = () => undefined;
  let rejectSchedule: (error: unknown) => void = () => undefined;
  let resolveStatus: (status: 'granted' | 'denied' | 'undetermined') => void = () => undefined;
  const client: PushTesterClient = {
    permissions: {
      getStatus: () => new Promise((resolve) => (resolveStatus = resolve)),
      request: async () => 'granted',
    },
    provider: { register: async () => null },
    local: {
      schedule: () =>
        new Promise<string>((resolve, reject) => {
          resolveSchedule = resolve;
          rejectSchedule = reject;
        }),
    },
  };
  return {
    client,
    finishSchedule: (id = 'x') => resolveSchedule(id),
    failSchedule: (error: unknown) => rejectSchedule(error),
    finishStatus: (status: 'granted' | 'denied' | 'undetermined') => resolveStatus(status),
  };
}

const OPTIONS = { categoryId: 'c', defaultTitle: 'T', defaultBody: 'B' };

describe('PushTesterController hardening', () => {
  it('keeps at most 6 sent tests by default', async () => {
    const { controller } = setup();
    for (let i = 0; i < 8; i += 1) await controller.send(2);
    expect(controller.getState().sent).toHaveLength(6);
  });

  it('clears the previous status the moment a send starts, not only when it ends', async () => {
    const { client, finishSchedule } = manualClient();
    const controller = new PushTesterController(client, OPTIONS);
    // put a stale status in place first
    const first = controller.send(2);
    finishSchedule();
    await first;
    expect(controller.getState().status).toEqual({ kind: 'scheduled', seconds: 2 });
    controller.noteTapped('0');
    expect(controller.getState().status?.kind).toBe('tapped');

    const second = controller.send(2);
    expect(controller.getState().status).toBeNull(); // cleared while in flight
    finishSchedule();
    await second;
  });

  it("reports an Error's own message, and a non-Error as its string form", async () => {
    const a = manualClient();
    const withError = new PushTesterController(a.client, OPTIONS);
    const sendA = withError.send(2);
    a.failSchedule(new Error('boom'));
    await sendA;
    expect(withError.getState().status).toEqual({ kind: 'scheduleFailed', message: 'boom' });

    const b = manualClient();
    const withString = new PushTesterController(b.client, OPTIONS);
    const sendB = withString.send(2);
    b.failSchedule('plain string');
    await sendB;
    expect(withString.getState().status).toEqual({ kind: 'scheduleFailed', message: 'plain string' });
  });

  it('send() resolves and still records the test when the caller’s formatTime throws', async () => {
    const platform = new FakePushPlatform();
    const client = new PushNotificationClient({ platform, categories: [CATEGORY] });
    const controller = new PushTesterController(client, {
      ...OPTIONS,
      categoryId: 'default',
      now: () => AT,
      formatTime: () => {
        throw new Error('formatter bug');
      },
    });
    await expect(controller.send(2)).resolves.toBeUndefined();
    expect(controller.getState().sent).toHaveLength(1);
    expect(controller.getState().sent[0]?.at).toBe(AT.toLocaleTimeString());
    expect(controller.getState().status).toEqual({ kind: 'scheduled', seconds: 2 });
  });

  it('fetchToken() never rejects -- a throwing provider reads as no token', async () => {
    const client: PushTesterClient = {
      permissions: { getStatus: async () => 'granted', request: async () => 'granted' },
      provider: { register: () => Promise.reject(new Error('provider bug')) },
      local: { schedule: async () => '' },
    };
    const controller = new PushTesterController(client, OPTIONS);
    await expect(controller.fetchToken()).resolves.toBeUndefined();
    expect(controller.getState().token).toBeNull();
  });

  it('a slow init() read never overwrites a newer answer from askPermission()', async () => {
    const { client, finishStatus } = manualClient();
    const controller = new PushTesterController(client, OPTIONS);
    const init = controller.init(); // read still pending...
    await controller.askPermission(); // ...the user answers first: granted
    finishStatus('undetermined'); // the stale read finally lands
    await init;
    expect(controller.getState().permission).toBe('granted');
  });

  it('init() can be called again to re-read the permission (returning from Settings)', async () => {
    const { platform, controller } = setup((p) => (p.permission = 'denied'));
    await controller.init();
    expect(controller.getState().permission).toBe('denied');
    platform.permission = 'granted';
    await controller.init();
    expect(controller.getState().permission).toBe('granted');
  });

  it('a subscriber that unsubscribes inside its callback does not skip the next one', () => {
    const { controller } = setup();
    const next = vi.fn();
    const off = controller.subscribe(() => off());
    controller.subscribe(next);
    controller.setTitle('x');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('a subscriber added during a change waits for the next change', () => {
    const { controller } = setup();
    const late = vi.fn();
    let added = false;
    controller.subscribe(() => {
      if (!added) {
        added = true;
        controller.subscribe(late);
      }
    });
    controller.setTitle('one');
    expect(late).not.toHaveBeenCalled();
    controller.setTitle('two');
    expect(late).toHaveBeenCalledTimes(1);
  });
});
