import { useEffect, useState } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogBuyerCallSection } from '../src/desks/sales/SalesCallWorkspacePage';
import { useAuth } from '../src/auth/AuthContext';
import { proxyRaiseAsks } from '../src/api/proxy';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/proxy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/proxy')>()),
  proxyRaiseAsks: vi.fn(),
}));
// The real picker loads the catalogue. This stand-in keeps the one behaviour that matters here:
// like the real one it reports its pack to `onChange` on every render, starting with ''.
vi.mock('../src/desks/enquiries/enquiryPickers', () => ({
  PackPicker: ({ onChange }: { onChange: (skuId: string) => void }) => {
    const [skuId, setSkuId] = useState('');
    useEffect(() => onChange(skuId), [skuId, onChange]);
    return <input aria-label="pack" value={skuId} onChange={(e) => setSkuId(e.target.value)} />;
  },
}));

function pickPacks(...skuIds: string[]) {
  skuIds.forEach((skuId, i) =>
    fireEvent.change(screen.getAllByLabelText('pack')[i]!, { target: { value: skuId } }),
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
  } as never);
  vi.mocked(proxyRaiseAsks).mockReset();
});

describe('Log a buyer call — several products in one call', () => {
  it('starts with one product, and lines can be added and removed', () => {
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    expect(screen.getAllByLabelText('pack')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /add another product/i }));
    fireEvent.click(screen.getByRole('button', { name: /add another product/i }));
    expect(screen.getAllByLabelText('pack')).toHaveLength(3);

    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]!);
    expect(screen.getAllByLabelText('pack')).toHaveLength(2);
  });

  it('sends every product under the one call note', async () => {
    vi.mocked(proxyRaiseAsks).mockResolvedValue({
      results: [
        { index: 0, askId: 'ask-a' },
        { index: 1, askId: 'ask-b' },
      ],
    });
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add another product/i }));
    pickPacks('sku-1', 'sku-2');
    fireEvent.change(screen.getAllByLabelText(/quantity/i)[1]!, { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: 'Two products.' } });
    fireEvent.click(screen.getByRole('button', { name: /log call \(2 products\)/i }));

    await waitFor(() => expect(proxyRaiseAsks).toHaveBeenCalledTimes(1));
    expect(vi.mocked(proxyRaiseAsks).mock.calls[0]![1]).toEqual({
      buyerCounterpartyId: 'cp-1',
      callNote: 'Two products.',
      lines: [
        { skuId: 'sku-1', qty: 1, conditionRequirement: { expiryBand: 'over12' } },
        { skuId: 'sku-2', qty: 4, conditionRequirement: { expiryBand: 'over12' } },
      ],
    });
    expect(await screen.findByText(/Logged 2 asks: ask-a, ask-b/)).toBeInTheDocument();
    // Back to a single fresh line, note cleared.
    expect(screen.getAllByLabelText('pack')).toHaveLength(1);
    expect(screen.getByLabelText(/call note/i)).toHaveValue('');
  });

  it('refuses to send a product that has no pack picked, without calling the server', () => {
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: 'note' } });
    fireEvent.click(screen.getByRole('button', { name: /^log call$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Product 1 needs/);
    expect(proxyRaiseAsks).not.toHaveBeenCalled();
  });

  it('keeps only the refused line, with its reason, so a retry cannot raise the saved one twice', async () => {
    vi.mocked(proxyRaiseAsks).mockResolvedValue({
      results: [
        { index: 0, askId: 'ask-a' },
        { index: 1, error: 'Buyers only.', code: 'FORBIDDEN' },
      ],
    });
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add another product/i }));
    pickPacks('sku-1', 'sku-2');
    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: 'note' } });
    fireEvent.click(screen.getByRole('button', { name: /log call \(2 products\)/i }));

    expect(await screen.findByText(/Not logged: Buyers only\./)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 products logged/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('pack')).toHaveLength(1);
    expect(screen.getByLabelText('pack')).toHaveValue('sku-2'); // The failed line, selection intact.
    expect(screen.getByLabelText(/call note/i)).toHaveValue('note'); // Kept for the retry.
  });
});
