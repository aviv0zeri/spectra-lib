import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RequestResponsePanel, resolvePanelTone } from './request-response-panel.jsx';

afterEach(cleanup);

const REQ = { method: 'POST', path: '/checkout-sessions/9c/verify', query: { project_id: 'p' } };

describe('resolvePanelTone', () => {
  it('derives the tone from the status code unless overridden', () => {
    expect(resolvePanelTone('auto', null)).toBe('pending');
    expect(resolvePanelTone('auto', { status: 0 })).toBe('unreachable');
    expect(resolvePanelTone('auto', {})).toBe('unreachable');
    expect(resolvePanelTone('auto', { status: 200 })).toBe('ok');
    expect(resolvePanelTone('auto', { status: 404 })).toBe('warn');
    expect(resolvePanelTone('auto', { status: 502 })).toBe('bad');
    expect(resolvePanelTone('bad', { status: 200 })).toBe('bad');
  });
});

describe('RequestResponsePanel', () => {
  it('shows the method, path, status and duration', () => {
    const { container } = render(
      <RequestResponsePanel
        request={REQ}
        response={{ status: 200, durationMs: 842.4, body: { payment_status: 'SUCCEEDED' } }}
      />,
    );
    const panel = container.querySelector('[data-slot="request-response-panel"]');
    expect(panel?.getAttribute('data-tone')).toBe('ok');
    expect(screen.getByText('POST')).toBeTruthy();
    expect(screen.getByText('/checkout-sessions/9c/verify')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
    expect(screen.getByText('842 ms')).toBeTruthy();
    expect(screen.getByText('"payment_status"')).toBeTruthy();
  });

  it('shows a spinner while the response is pending', () => {
    const { container } = render(<RequestResponsePanel request={REQ} labels={{ pending: 'Waiting' }} />);
    expect(container.querySelector('[data-slot="request-response-panel"]')?.getAttribute('data-tone')).toBe(
      'pending',
    );
    expect(screen.getByRole('status', { name: 'Waiting' })).toBeTruthy();
  });

  it('labels an unreachable backend instead of inventing a status', () => {
    render(<RequestResponsePanel request={REQ} response={{ status: 0 }} labels={{ unreachable: 'No proxy' }} />);
    expect(screen.getAllByText('No proxy').length).toBeGreaterThan(0);
  });

  it('says so when there is no request body and no query', () => {
    render(
      <RequestResponsePanel
        request={{ method: 'GET', path: '/health' }}
        response={{ status: 200, body: { ok: true } }}
        labels={{ noBody: 'nothing sent' }}
      />,
    );
    expect(screen.getByText('nothing sent')).toBeTruthy();
  });
});
