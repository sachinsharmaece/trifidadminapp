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
import { proxyListBuyerAsks, proxyWantsIt } from '../src/api/proxy';
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
  vi.mocked(proxyListBuyerAsks).mockReset().mockResolvedValue([]);
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
    const asksLoadsBefore = vi.mocked(proxyListBuyerAsks).mock.calls.length;
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
    await waitFor(() =>
      expect(vi.mocked(proxyListBuyerAsks).mock.calls.length).toBeGreaterThan(asksLoadsBefore),
    );
    // The call history reloads, so the new call shows without a page refresh.
    await waitFor(() =>
      expect(vi.mocked(listCallLogsForBuyer).mock.calls.length).toBeGreaterThan(historyLoadsBefore),
    );
  });
});
