import { describe, expect, it } from 'vitest';

import { toNotificationEvent } from './notification';

describe('toNotificationEvent', () => {
  it('lifts title, body and data straight across', () => {
    const event = toNotificationEvent({ title: 'Hi', body: 'There', data: { a: 1 } });
    expect(event).toEqual({ categoryId: '', title: 'Hi', body: 'There', data: { a: 1 }, silent: false });
  });

  it('prefers data.categoryId over the iOS categoryIdentifier', () => {
    const event = toNotificationEvent({
      title: 't',
      data: { categoryId: 'from-data' },
      categoryIdentifier: 'from-ios',
    });
    expect(event.categoryId).toBe('from-data');
  });

  it('falls back to categoryIdentifier when the payload has no categoryId', () => {
    expect(toNotificationEvent({ title: 't', categoryIdentifier: 'from-ios' }).categoryId).toBe('from-ios');
  });

  it('ignores a non-string data.categoryId', () => {
    const event = toNotificationEvent({ title: 't', data: { categoryId: 7 }, categoryIdentifier: 'ios' });
    expect(event.categoryId).toBe('ios');
  });

  it('is silent when the sender says so, even with visible content', () => {
    expect(toNotificationEvent({ title: 't', body: 'b', data: { silent: true } }).silent).toBe(true);
  });

  it('is silent when there is neither title nor body', () => {
    expect(toNotificationEvent({ data: { x: 1 } }).silent).toBe(true);
    expect(toNotificationEvent({ title: '', body: null }).silent).toBe(true);
  });

  it('is NOT silent with only a title or only a body', () => {
    expect(toNotificationEvent({ title: 't' }).silent).toBe(false);
    expect(toNotificationEvent({ body: 'b' }).silent).toBe(false);
  });

  it('turns absent fields into empty strings and an empty object', () => {
    expect(toNotificationEvent({})).toEqual({ categoryId: '', title: '', body: '', data: {}, silent: true });
  });
});
