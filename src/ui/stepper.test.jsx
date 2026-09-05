import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Step, Stepper } from './stepper.jsx';

afterEach(cleanup);

const STEPS = [
  { id: 'profile', label: 'Create profile', state: 'done' },
  { id: 'verify', label: 'Verify', state: 'active', hint: 'Manual button, never polled' },
  { id: 'webhook', label: 'Webhook reaches Payments', state: 'unavailable', reason: 'Intake disabled' },
  { id: 'receipt', label: 'Send receipt', state: 'pending' },
];

describe('Stepper', () => {
  it('renders every step with its state and numbers only the plain ones', () => {
    const { container } = render(<Stepper steps={STEPS} aria-label="Walkthrough" />);
    const rows = container.querySelectorAll('[data-slot="step"]');
    expect(rows.length).toBe(4);
    expect([...rows].map((r) => r.getAttribute('data-state'))).toEqual([
      'done',
      'active',
      'unavailable',
      'pending',
    ]);
    // The pending step shows its 1-based index; the done step shows a check, not a number.
    expect(rows[3].textContent).toContain('4');
    expect(rows[0].textContent).not.toContain('1');
  });

  it('marks the active step with aria-current="step"', () => {
    render(<Stepper steps={STEPS} />);
    const current = screen.getByText('Verify').closest('[data-slot="step"]');
    expect(current?.getAttribute('aria-current')).toBe('step');
  });

  it('shows the reason only for unavailable steps', () => {
    render(<Stepper steps={STEPS} />);
    expect(screen.getByText('Intake disabled')).toBeTruthy();
    expect(screen.getByText('Manual button, never polled')).toBeTruthy();
  });

  it('is non-interactive without onSelect and a button list with it', () => {
    const { container, rerender } = render(<Stepper steps={STEPS} />);
    expect(container.querySelectorAll('button').length).toBe(0);
    const onSelect = vi.fn();
    rerender(<Stepper steps={STEPS} onSelect={onSelect} selectedId="verify" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
    fireEvent.click(screen.getByText('Send receipt'));
    expect(onSelect).toHaveBeenCalledWith('receipt');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('Step renders standalone with the same marker rules', () => {
    const { container } = render(<Step state="failed" label="Charge" index={2} />);
    const row = container.querySelector('[data-slot="step"]');
    expect(row?.getAttribute('data-state')).toBe('failed');
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
