import { useState } from 'react';
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
// The real row searches and loads the catalogue (see CallLineFields.test.tsx). This stand-in
// keeps what the form depends on: it reports its pack, quantity and rate, and can be removed.
vi.mock('../src/desks/sales/CallLineFields', () => ({
  CallLineFields: ({
    qty,
    expectedRate,
    error,
    onSkuChange,
    onQtyChange,
    onExpectedRateChange,
    onRemove,
  }: {
    qty: number;
    expectedRate: string;
    error?: string;
    onSkuChange: (skuId: string) => void;
    onQtyChange: (qty: number) => void;
    onExpectedRateChange: (rupees: string) => void;
    onRemove?: () => void;
  }) => {
    const [skuId, setSkuId] = useState('');
    return (
      <div>
        <input
          aria-label="pack"
          value={skuId}
          onChange={(e) => {
            setSkuId(e.target.value);
            onSkuChange(e.target.value);
          }}
        />
        <input
          aria-label="quantity"
          value={qty}
          onChange={(e) => onQtyChange(Number(e.target.value))}
        />
        <input
          aria-label="expected rate"
          value={expectedRate}
          onChange={(e) => onExpectedRateChange(e.target.value)}
        />
        {onRemove && <button onClick={onRemove}>Remove</button>}
        {error && <p>Not logged: {error}</p>}
      </div>
    );
  },
}));

function pickPacks(...skuIds: string[]) {
  skuIds.forEach((skuId, i) =>
    fireEvent.change(screen.getAllByLabelText('pack')[i]!, { target: { value: skuId } }),
  );
}

function setNote(note: string) {
  fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: note } });
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

  it('sends every product under the one call note, with the expected rate only where one was typed', async () => {
    vi.mocked(proxyRaiseAsks).mockResolvedValue({
      results: [
        { index: 0, kind: 'pile', pileId: 'pile-a', listingLineId: 'l1' },
        { index: 1, kind: 'ask', askId: 'ask-b' },
      ],
    });
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add another product/i }));
    pickPacks('sku-1', 'sku-2');
    fireEvent.change(screen.getAllByLabelText(/quantity/i)[1]!, { target: { value: '4' } });
    fireEvent.change(screen.getAllByLabelText(/expected rate/i)[0]!, {
      target: { value: '1250.50' },
    });
    setNote('Two products.');
    fireEvent.click(screen.getByRole('button', { name: /log call \(2 products\)/i }));

    await waitFor(() => expect(proxyRaiseAsks).toHaveBeenCalledTimes(1));
    expect(vi.mocked(proxyRaiseAsks).mock.calls[0]![1]).toEqual({
      buyerCounterpartyId: 'cp-1',
      callNote: 'Two products.',
      lines: [
        {
          skuId: 'sku-1',
          qty: 1,
          conditionRequirement: { expiryBand: 'over12' },
          expectedRatePaise: 125050, // Rupees typed, paise sent.
        },
        { skuId: 'sku-2', qty: 4, conditionRequirement: { expiryBand: 'over12' } },
      ],
    });
    expect(
      await screen.findByText(
        /1 on the board — sent to the seller to confirm\. 1 not listed — an ask for Purchase\./,
      ),
    ).toBeInTheDocument();
    // Back to a single fresh line, note cleared.
    expect(screen.getAllByLabelText('pack')).toHaveLength(1);
    expect(screen.getByLabelText(/call note/i)).toHaveValue('');
  });

  it('counts a line added to an ask he already had open apart from new asks (30 Oct, BR-371)', async () => {
    vi.mocked(proxyRaiseAsks).mockResolvedValue({
      results: [
        { index: 0, kind: 'ask', askId: 'ask-a', merged: false },
        { index: 1, kind: 'ask', askId: 'ask-a', merged: true },
      ],
    });
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add another product/i }));
    pickPacks('sku-1', 'sku-1');
    setNote('Same pack twice.');
    fireEvent.click(screen.getByRole('button', { name: /log call \(2 products\)/i }));
    expect(
      await screen.findByText(
        /1 not listed — an ask for Purchase\. 1 added to an ask he already had open\./,
      ),
    ).toBeInTheDocument();
  });

  it('refuses a zero or negative expected rate without calling the server', () => {
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    pickPacks('sku-1');
    fireEvent.change(screen.getByLabelText(/expected rate/i), { target: { value: '0' } });
    setNote('note');
    fireEvent.click(screen.getByRole('button', { name: /^log call$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Product 1: the expected rate/);
    expect(proxyRaiseAsks).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/expected rate/i), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /^log call$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/expected rate/);
    expect(proxyRaiseAsks).not.toHaveBeenCalled();
  });

  it('refuses to send a product that has no pack picked, without calling the server', () => {
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    setNote('note');
    fireEvent.click(screen.getByRole('button', { name: /^log call$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Product 1 needs/);
    expect(proxyRaiseAsks).not.toHaveBeenCalled();
  });

  it('keeps only the refused line, with its reason, so a retry cannot raise the saved one twice', async () => {
    vi.mocked(proxyRaiseAsks).mockResolvedValue({
      results: [
        { index: 0, kind: 'ask', askId: 'ask-a' },
        { index: 1, error: 'Buyers only.', code: 'FORBIDDEN' },
      ],
    });
    render(<LogBuyerCallSection buyerCounterpartyId="cp-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add another product/i }));
    pickPacks('sku-1', 'sku-2');
    setNote('note');
    fireEvent.click(screen.getByRole('button', { name: /log call \(2 products\)/i }));

    expect(await screen.findByText(/Not logged: Buyers only\./)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 products logged/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('pack')).toHaveLength(1);
    expect(screen.getByLabelText('pack')).toHaveValue('sku-2'); // The failed line, selection intact.
    expect(screen.getByLabelText(/call note/i)).toHaveValue('note'); // Kept for the retry.
  });
});
