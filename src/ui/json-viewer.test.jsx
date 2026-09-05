import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JsonViewer } from './json-viewer.jsx';

afterEach(cleanup);

const VALUE = {
  payment_id: '1e2f',
  amount: '10.00',
  ok: true,
  nested: { deeper: { leaf: null }, list: [1, 2] },
};

describe('JsonViewer', () => {
  it('renders keys and primitive values', () => {
    render(<JsonViewer value={VALUE} />);
    expect(screen.getByText('"payment_id"')).toBeTruthy();
    expect(screen.getByText('"1e2f"')).toBeTruthy();
    expect(screen.getByText('true')).toBeTruthy();
  });

  it('opens the first `collapsedDepth` levels and folds deeper ones', () => {
    render(<JsonViewer value={VALUE} collapsedDepth={2} />);
    // depth 0 (root) and depth 1 (`nested`) are open; depth 2 (`deeper`, `list`) are folded.
    expect(screen.queryByText('"leaf"')).toBeNull();
    const toggles = screen.getAllByRole('button', { expanded: false });
    expect(toggles.length).toBe(2);
    fireEvent.click(toggles[0]);
    expect(screen.getByText('"leaf"')).toBeTruthy();
    expect(screen.getByText('null')).toBeTruthy();
  });

  it('summarizes folded nodes by size', () => {
    render(<JsonViewer value={VALUE} collapsedDepth={1} />);
    expect(screen.getByText(/2 keys/)).toBeTruthy();
  });

  it('copies the pretty-printed JSON and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<JsonViewer value={{ a: 1 }} copyLabel="Copy JSON" copiedLabel="Done" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2)));
    await waitFor(() => expect(screen.getByText('Done')).toBeTruthy());
  });

  it('renders empty containers without a toggle', () => {
    render(<JsonViewer value={{ empty: {}, none: [] }} />);
    expect(screen.getByText('{}')).toBeTruthy();
    expect(screen.getByText('[]')).toBeTruthy();
  });
});
