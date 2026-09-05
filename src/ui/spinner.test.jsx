import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Spinner } from './spinner.jsx';

afterEach(cleanup);

describe('Spinner', () => {
  it('is a status region named by `label`, with the ring hidden from AT', () => {
    const { container } = render(<Spinner label="Sending" />);
    const status = screen.getByRole('status', { name: 'Sending' });
    expect(status).toBeTruthy();
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('defaults the accessible name and renders visible children separately', () => {
    render(<Spinner>Verifying with Cardcom…</Spinner>);
    const status = screen.getByRole('status', { name: 'Loading' });
    expect(status.textContent).toContain('Verifying with Cardcom…');
  });
});
