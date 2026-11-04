import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { proxyAcceptPileOffer, proxyDeclinePileOffer } from '../src/api/proxy';
import {
  requestPileOfferChange,
  type BuyerFilePileOffer,
  type BuyerFileRateChange,
} from '../src/api/sales';
import { ToastProvider } from '../src/components/ui/Toast';
import { PileOffersTable } from '../src/desks/sales/PileOfferActions';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/proxy', () => ({
  proxyAcceptPileOffer: vi.fn(),
  proxyDeclinePileOffer: vi.fn(),
}));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  requestPileOfferChange: vi.fn(),
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
  vi.mocked(requestPileOfferChange).mockReset().mockResolvedValue({ requestId: 'c1' });
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
  rateChange: null,
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

/** 4 Nov — Rate given → Change on a pile deal (BR-379): fewer boxes and/or another rate, with approval. */
const change = (over: Partial<BuyerFileRateChange> = {}): BuyerFileRateChange => ({
  requestId: 'rc1',
  status: 'pending',
  boxes: 6,
  ratePaise: 13000,
  shownRatePaise: 12272,
  reasonCode: 'near_expiry',
  callNote: 'He will take six.',
  requestedByName: 'Asha',
  requestedAt: '2026-11-02T09:30:00.000Z',
  decidedByName: null,
  decisionNote: '',
  canDecide: false,
  canWithdraw: true,
  ...over,
});

describe('Changing a deal the seller confirmed (BR-379)', () => {
  it('Change asks for fewer boxes, and says the rest go back on his listing', async () => {
    show([offer()]);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    const modal = await dialog();
    expect(modal).toHaveTextContent('ashitaka · 50 GM — he was shown ₹122.72 for 10 boxes.');
    expect(modal).toHaveTextContent('the rest go back on his listing');
    fireEvent.change(within(modal).getByLabelText(/^Boxes/), { target: { value: '6' } });
    fireEvent.change(within(modal).getByLabelText(/^Call note/), {
      target: { value: 'He will take six.' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Ask for approval' }));
    await waitFor(() => expect(requestPileOfferChange).toHaveBeenCalledTimes(1));
    const [, requestId, body] = vi.mocked(requestPileOfferChange).mock.calls[0]!;
    expect(requestId).toBe('r1');
    expect(body).toEqual({ boxes: 6, ratePaise: 12272, callNote: 'He will take six.' });
  });

  it('is off once his hold has ended', () => {
    show([offer({ holdUntil: '2026-11-02T09:59:00.000Z' })]); // A minute before "now".
    expect(screen.getByText('Hold ended')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
  });

  it('a change waiting for approval holds Confirm back and shows what was asked', () => {
    show([offer({ rateChange: change() })]);
    expect(screen.getByText('Waiting for approval')).toBeInTheDocument();
    expect(screen.getByText(/6 boxes at ₹130.00/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Withdraw request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Walk away' })).toBeInTheDocument();
  });

  it('once approved, Confirm raises the order at the approved figures and says where the rest goes', async () => {
    show([offer({ rateChange: change({ status: 'approved', decidedByName: 'Leader Lal' }) })]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    const modal = await dialog();
    expect(modal).toHaveTextContent('Approved by Leader Lal');
    expect(modal).toHaveTextContent('6 boxes at ₹130.00');
    expect(modal).toHaveTextContent('The other 4 boxes go back on the seller');
    fireEvent.change(within(modal).getByLabelText(/^Call note/), { target: { value: 'Agreed.' } });
    fireEvent.click(within(modal).getByRole('button', { name: /confirm and raise the order/i }));
    await waitFor(() => expect(proxyAcceptPileOffer).toHaveBeenCalledTimes(1));
    // Only the approval id goes — never raw boxes or a rate.
    expect(vi.mocked(proxyAcceptPileOffer).mock.calls[0]![2]).toEqual({
      buyerCounterpartyId: 'c1',
      callNote: 'Agreed.',
      approvalId: 'rc1',
    });
  });
});
