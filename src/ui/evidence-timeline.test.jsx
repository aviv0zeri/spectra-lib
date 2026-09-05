import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EvidenceTimeline } from './evidence-timeline.jsx';

afterEach(cleanup);

describe('EvidenceTimeline', () => {
  it('renders the empty label when there are no entries', () => {
    render(<EvidenceTimeline entries={[]} emptyLabel="No evidence yet" />);
    expect(screen.getByText('No evidence yet')).toBeTruthy();
  });

  it('renders entries in the given order with tone, time, detail and id chips', () => {
    const { container } = render(
      <EvidenceTimeline
        formatTime={(at) => `T:${at}`}
        entries={[
          { id: 'a', at: '2026-09-05T15:30:12Z', label: 'Verify → SUCCEEDED', tone: 'ok', ids: { payment_id: '1e2f' } },
          { id: 'b', at: '2026-09-05T15:31:00Z', label: 'Send refused', tone: 'bad', detail: 'destination_not_allowlisted' },
        ]}
      />,
    );
    const rows = container.querySelectorAll('li');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('data-tone')).toBe('ok');
    expect(rows[1].getAttribute('data-tone')).toBe('bad');
    expect(screen.getByText('T:2026-09-05T15:30:12Z')).toBeTruthy();
    expect(screen.getByText('destination_not_allowlisted')).toBeTruthy();
    expect(screen.getByText('payment_id')).toBeTruthy();
    expect(screen.getByText('1e2f')).toBeTruthy();
    expect(container.querySelector('time')?.getAttribute('dateTime')).toBe('2026-09-05T15:30:12Z');
  });

  it('defaults the tone to muted', () => {
    const { container } = render(<EvidenceTimeline entries={[{ at: 0, label: 'x' }]} />);
    expect(container.querySelector('li')?.getAttribute('data-tone')).toBe('muted');
  });
});
