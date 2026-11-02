import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { ToastProvider } from '../src/components/ui/Toast';
import {
  getSalesBoardForBuyer,
  getSalesBuyerFile,
  createCallLog,
  listCallLogsForBuyer,
} from '../src/api/sales';
import { proxyPoolChange, proxyPoolWithdraw, proxyWantsIt } from '../src/api/proxy';
import { SalesCallWorkspacePage } from '../src/desks/sales/SalesCallWorkspacePage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  getSalesBuyerFile: vi.fn(),
  getSalesBoardForBuyer: vi.fn(),
  createCallLog: vi.fn(),
  listCallLogsForBuyer: vi.fn().mockResolvedValue([]),
}));
vi.mock('../src/api/proxy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/proxy')>()),
  proxyListBuyerAsks: vi.fn(),
  proxyRaiseAsk: vi.fn(),
  proxyWantsIt: vi.fn(),
  proxyPoolChange: vi.fn(),
  proxyPoolWithdraw: vi.fn(),
  proxyRaiseAsks: vi.fn(),
}));
// The call-line rows search the catalogue; not under test here.
vi.mock('../src/desks/sales/CallLineFields', () => ({ CallLineFields: () => null }));

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
  vi.mocked(getSalesBuyerFile).mockResolvedValue({
    buyerId: 'b1',
    counterpartyId: 'c1',
    firm: 'UMIYA PATIDAR KRISHI SEWA KENDRA ASTHA',
    mobile: '9827625116',
    tehsil: 'Ashta',
    tier: 'Retailer',
    accountStatus: 'active',
  } as never);
  vi.mocked(getSalesBoardForBuyer).mockResolvedValue([
    {
      productId: 'p1',
      brand: 'dhanutop super',
      technicalName: 'pendamethilean 38%',
      ladder: [
        {
          listingLineId: 'l1',
          skuId: 'k1',
          ratePaise: 29736,
          packLabel: '350 ML',
          expiryBand: 'over12',
          moqBand: 'none',
          deliveryBand: '48h',
          qty: 15,
        },
      ],
    },
  ] as never);
  vi.mocked(proxyWantsIt)
    .mockReset()
    .mockResolvedValue({ kind: 'pile', pileId: 'p1', listingLineId: 'l1' });
  vi.mocked(createCallLog).mockReset();
});

function renderPage() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/sales/call/b1']}>
        <Routes>
          <Route path="/sales/call/:buyerId" element={<SalesCallWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Call page — "He wants it" (28 Oct; 29 Oct — a listed offer, so a pile, not an ask)', () => {
  it('puts this buyer on that offer, not just a note, and reloads the page', async () => {
    renderPage();
    // The first render in a full run pays the cold start; give the board time to load.
    fireEvent.click(await screen.findByRole('button', { name: 'He wants it' }, { timeout: 5000 }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Boxes he wants/), { target: { value: '4' } });
    fireEvent.change(within(dialog).getByLabelText(/^Call note/), {
      target: { value: 'He wants 4 boxes of the 350 ML.' },
    });
    const historyLoadsBefore = vi.mocked(listCallLogsForBuyer).mock.calls.length;
    fireEvent.click(within(dialog).getByRole('button', { name: /put him on this offer/i }));

    await waitFor(() => expect(proxyWantsIt).toHaveBeenCalled());
    expect(vi.mocked(proxyWantsIt).mock.calls[0]![1]).toBe('l1');
    expect(vi.mocked(proxyWantsIt).mock.calls[0]![2]).toMatchObject({
      buyerCounterpartyId: 'c1',
      qty: 4,
      direction: 'out', // the page's Incoming/Outgoing toggle starts on Outgoing
    });
    expect(await screen.findByText(/Sent to the seller to confirm/)).toBeInTheDocument();
    expect(createCallLog).not.toHaveBeenCalled();
    // The call history reloads, so the new call shows without a page refresh.
    await waitFor(() =>
      expect(vi.mocked(listCallLogsForBuyer).mock.calls.length).toBeGreaterThan(historyLoadsBefore),
    );
  });

  it('has no "Advance an ask on a call" or "What the call produced" card (29 Oct — removed)', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'He wants it' }, { timeout: 5000 });
    expect(screen.queryByText('Advance an ask on a call')).toBeNull();
    expect(screen.queryByText(/Promoted-fallback decision/)).toBeNull();
    expect(screen.queryByText('What the call produced')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save the call' })).toBeNull();
    expect(screen.getByText('Call history')).toBeInTheDocument();
  });
});

describe('Call page — board products fold under a rate count (29 Oct)', () => {
  const line = (id: string, ratePaise: number) => ({
    listingLineId: id,
    skuId: 'k1',
    ratePaise,
    packLabel: '350 ML',
    expiryBand: 'over12',
    moqBand: 'none',
    deliveryBand: '48h',
    qty: 15,
  });

  it('shows "N rates available · from ₹…" and hides the rates until the product is opened', async () => {
    vi.mocked(getSalesBoardForBuyer).mockResolvedValue([
      {
        productId: 'p1',
        brand: 'dhanutop super',
        technicalName: 'pendamethilean 38%',
        ladder: [
          line('l1', 29344),
          line('l2', 28745),
          line('l3', 29942),
          line('l4', 35931),
          line('l5', 37129),
        ],
      },
      {
        productId: 'p2',
        brand: 'DEMO ImidaPro',
        technicalName: 'Imidacloprid 17.8% SL',
        ladder: [line('l6', 33536)],
      },
    ] as never);
    renderPage();

    const dhanutop = await screen.findByRole(
      'button',
      { name: /dhanutop super.*5 rates available · from ₹287\.45/ },
      { timeout: 5000 },
    );
    const imida = screen.getByRole('button', {
      name: /DEMO ImidaPro.*1 rate available · from ₹335\.36/,
    });
    expect(dhanutop).toHaveAttribute('aria-expanded', 'false');
    expect(imida).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'He wants it' })).toBeNull();

    fireEvent.click(dhanutop);
    expect(dhanutop).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('button', { name: 'He wants it' })).toHaveLength(5);
  });

  it('1 Nov — a buyer not yet approved: says so, and "He wants it" and Log call are off', async () => {
    vi.mocked(getSalesBuyerFile).mockResolvedValue({
      buyerId: 'b1',
      counterpartyId: 'c1',
      firm: 'A S krishi seva kendra',
      mobile: '9827625116',
      tehsil: 'Ashta',
      tier: 'Retailer',
      accountStatus: 'pending',
    } as never);
    renderPage();
    expect(await screen.findByText('Not approved yet.', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'open Registrations' })).toHaveAttribute(
      'href',
      '/registrations',
    );
    expect(
      await screen.findByRole('button', { name: 'He wants it' }, { timeout: 5000 }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Log call/ })).toBeDisabled();
  });
});

describe('Call page — a closed offer and his place in a pool (2 Nov)', () => {
  const line = (extra: Record<string, unknown>) => ({
    listingLineId: 'l1',
    skuId: 'k1',
    ratePaise: 29736,
    packLabel: '350 ML',
    expiryBand: 'over12',
    moqBand: 'none',
    deliveryBand: '48h',
    qty: 15,
    closed: null,
    poolOpen: false,
    inPool: null,
    ...extra,
  });
  const board = (ladderLine: Record<string, unknown>) =>
    vi.mocked(getSalesBoardForBuyer).mockResolvedValue([
      {
        productId: 'p1',
        brand: 'dhanutop super',
        technicalName: 'pendamethilean 38%',
        ladder: [ladderLine],
      },
    ] as never);

  it('shows what the seller decided, and keeps "He wants it" off', async () => {
    board(line({ closed: 'confirmed' }));
    renderPage();
    expect(
      await screen.findByText('Confirmation in progress', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'He wants it' })).toBeDisabled();
  });

  it('closed but its pool is still open: He wants it stays, for fewer than the minimum', async () => {
    board(line({ closed: 'confirmed', poolOpen: true }));
    renderPage();
    expect(
      await screen.findByText('Confirmation in progress', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'He wants it' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(
      await screen.findByText(/Only fewer boxes than its minimum order can still join its pool/),
    ).toBeInTheDocument();
  });

  it('closed AND he is in its pool (the BASAGRAM case): his place and its buttons still show', async () => {
    board(
      line({
        closed: 'confirmed',
        poolOpen: true,
        inPool: {
          poolId: 'pool1',
          boxes: 3,
          committedBoxes: 3,
          moq: 10,
          status: 'open',
          canChange: true,
        },
      }),
    );
    renderPage();
    expect(
      await screen.findByText(/In the pool with 3 boxes \(3 of 10\)/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Confirmation in progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change boxes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'He wants it' })).toBeNull();
  });

  it.each([
    ['requoted', 'Seller revised — awaiting buyers'],
    ['declined', 'Seller declined — closed'],
    ['sold_out', 'Sold out'],
  ])('says why for a %s line', async (closed, text) => {
    board(line({ closed }));
    renderPage();
    expect(await screen.findByText(text, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  const inPool = (extra: Record<string, unknown> = {}) => ({
    poolId: 'pool1',
    boxes: 3,
    committedBoxes: 3,
    moq: 10,
    status: 'open',
    canChange: true,
    ...extra,
  });

  it('shows his place in the pool, and changes the boxes with a call note', async () => {
    vi.mocked(proxyPoolChange)
      .mockReset()
      .mockResolvedValue({ poolId: 'pool1', previousQty: 3, qty: 5 });
    board(line({ inPool: inPool() }));
    renderPage();
    expect(
      await screen.findByText(/In the pool with 3 boxes \(3 of 10\)/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'He wants it' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Change boxes' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Change boxes' });
    // Unchanged boxes is not a change.
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/^Boxes he wants/), { target: { value: '5' } });
    fireEvent.change(within(dialog).getByLabelText(/^Call note/), {
      target: { value: 'Wants 5 now.' },
    });
    fireEvent.click(submit);

    await waitFor(() => expect(proxyPoolChange).toHaveBeenCalled());
    expect(vi.mocked(proxyPoolChange).mock.calls[0]![1]).toBe('pool1');
    expect(vi.mocked(proxyPoolChange).mock.calls[0]![2]).toMatchObject({
      buyerCounterpartyId: 'c1',
      qty: 5,
      callNote: 'Wants 5 now.',
      direction: 'out',
    });
    expect(await screen.findByText('Changed to 5 boxes in the pool.')).toBeInTheDocument();
  });

  it('withdraws him from the pool with a call note', async () => {
    vi.mocked(proxyPoolWithdraw).mockReset().mockResolvedValue({ poolId: 'pool1' });
    board(line({ inPool: inPool() }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }, { timeout: 5000 }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Call note/), {
      target: { value: 'Changed his mind.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw' }));
    await waitFor(() => expect(proxyPoolWithdraw).toHaveBeenCalled());
    expect(vi.mocked(proxyPoolWithdraw).mock.calls[0]![1]).toBe('pool1');
    expect(vi.mocked(proxyPoolWithdraw).mock.calls[0]![2]).toMatchObject({
      buyerCounterpartyId: 'c1',
      callNote: 'Changed his mind.',
    });
    expect(await screen.findByText('Withdrawn from the pool.')).toBeInTheDocument();
  });

  it('a binding place cannot be changed: no buttons, and it says why', async () => {
    board(line({ inPool: inPool({ canChange: false, status: 'reconfirm' }) }));
    renderPage();
    expect(
      await screen.findByText(/Binding — can.t be changed/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change boxes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
  });
});
