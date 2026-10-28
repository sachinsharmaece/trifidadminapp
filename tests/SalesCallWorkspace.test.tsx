import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { ToastProvider } from '../src/components/ui/Toast';
import { getSalesBoardForBuyer, getSalesBuyerFile, createCallLog } from '../src/api/sales';
import { proxyListBuyerAsks, proxyRaiseAsk } from '../src/api/proxy';
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
  vi.mocked(proxyRaiseAsk)
    .mockReset()
    .mockResolvedValue({ askId: 'a1' } as never);
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

describe('Call page — "He wants it" (28 Oct)', () => {
  it('raises a real ask for this buyer, not just a note, and reloads "Advance an ask"', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'He wants it' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Boxes he wants/), { target: { value: '4' } });
    fireEvent.change(within(dialog).getByLabelText(/^Call note/), {
      target: { value: 'He wants 4 boxes of the 350 ML.' },
    });
    const asksLoadsBefore = vi.mocked(proxyListBuyerAsks).mock.calls.length;
    fireEvent.click(within(dialog).getByRole('button', { name: /add to he asked/i }));

    await waitFor(() => expect(proxyRaiseAsk).toHaveBeenCalled());
    expect(vi.mocked(proxyRaiseAsk).mock.calls[0]![1]).toMatchObject({
      buyerCounterpartyId: 'c1',
      skuId: 'k1',
      qty: 4,
      conditionRequirement: { expiryBand: 'over12', deliveryBand: '48h' },
    });
    expect(createCallLog).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(vi.mocked(proxyListBuyerAsks).mock.calls.length).toBeGreaterThan(asksLoadsBefore),
    );
  });
});
