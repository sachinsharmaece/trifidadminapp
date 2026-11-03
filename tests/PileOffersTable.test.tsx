import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { proxyAcceptPileOffer, proxyDeclinePileOffer } from '../src/api/proxy';
import type { BuyerFilePileOffer } from '../src/api/sales';
import { ToastProvider } from '../src/components/ui/Toast';
import { PileOffersTable } from '../src/desks/sales/PileOfferActions';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/proxy', () => ({
  proxyAcceptPileOffer: vi.fn(),
  proxyDeclinePileOffer: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => true,
    status: 'authenticated',
    me: null,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
  vi.mocked(proxyAcceptPileOffer).mockReset().mockResolvedValue({ soId: 'so1', boxes: 10 });
  vi.mocked(proxyDeclinePileOffer).mockReset().mockResolvedValue({ released: true });
});

const NOW = Date.parse('2026-11-02T10:00:00.000Z');
const offer = (over: Partial<BuyerFilePileOffer> = {}): BuyerFilePileOffer => ({
  requestId: 'r1',
  productId: 'p1',
  brand: 'ashitaka',
  packLabel: '50 GM',
  boxes: 10,
  askedBoxes: 10,
  ratePaise: 12272,
  expiryExact: '2028',
  expiryBand: 'over12',
  deliveryBand: '48h',
  offeredAt: '2026-11-02T09:00:00.000Z',
  holdUntil: '2026-11-03T09:00:00.000Z',
  ...over,
});

function show(offers: BuyerFilePileOffer[], onDone = vi.fn()) {
  const view = render(
    <ToastProvider>
      <PileOffersTable offers={offers} counterpartyId="c1" now={NOW} onDone={onDone} />
    </ToastProvider>,
  );
  return { onDone, ...view };
}
const dialog = () => screen.findByRole('dialog');

describe('Deals the seller confirmed, under Rate given (BR-378)', () => {
  it('shows nothing when there are none', () => {
    const { container } = show([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows what he would be taking: his rate, the boxes, the expiry, and how long it is held', () => {
    show([offer()]);
    expect(screen.getByText(/Confirmed by the seller/)).toBeInTheDocument();
    expect(screen.getByText('ashitaka · 50 GM')).toBeInTheDocument();
    expect(screen.getByText('₹122.72')).toBeInTheDocument();
    expect(screen.getByText('2028')).toBeInTheDocument();
    expect(screen.getByText('23h left')).toBeInTheDocument();
    expect(screen.queryByText(/asked/)).toBeNull();
  });

  it('says so when the seller confirmed fewer boxes than he asked for', () => {
    show([offer({ boxes: 10, askedBoxes: 15 })]);
    expect(screen.getByText('of 15 asked')).toBeInTheDocument();
  });

  it('Confirm raises the order on his word, with the call note, and refreshes the file', async () => {
    const { onDone } = show([offer()]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    const modal = await dialog();
    expect(modal).toHaveTextContent('ashitaka · 50 GM — 10 boxes at ₹122.72.');
    expect(modal).toHaveTextContent('his payment window starts');
    fireEvent.change(within(modal).getByLabelText(/^Call note/), {
      target: { value: 'He said yes, send it.' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /confirm and raise the order/i }));
    await waitFor(() => expect(proxyAcceptPileOffer).toHaveBeenCalledTimes(1));
    expect(vi.mocked(proxyAcceptPileOffer).mock.calls[0]![1]).toBe('r1');
    expect(vi.mocked(proxyAcceptPileOffer).mock.calls[0]![2]).toEqual({
      buyerCounterpartyId: 'c1',
      callNote: 'He said yes, send it.',
    });
    expect(await screen.findByText('Order raised — now in Payment pending.')).toBeInTheDocument();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('Walk away makes no order and says the boxes go back', async () => {
    const { onDone } = show([offer({ boxes: 10, askedBoxes: 15 })]);
    fireEvent.click(screen.getByRole('button', { name: 'Walk away' }));
    const modal = await dialog();
    expect(modal).toHaveTextContent('the boxes go back on the seller');
    fireEvent.change(within(modal).getByLabelText(/^Call note/), {
      target: { value: 'Does not want it now.' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Walk away' }));
    await waitFor(() => expect(proxyDeclinePileOffer).toHaveBeenCalledTimes(1));
    expect(vi.mocked(proxyDeclinePileOffer).mock.calls[0]![2]).toEqual({
      buyerCounterpartyId: 'c1',
      callNote: 'Does not want it now.',
    });
    expect(proxyAcceptPileOffer).not.toHaveBeenCalled();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
