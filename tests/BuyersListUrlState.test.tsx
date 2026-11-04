import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { listSalesBuyersPage } from '../src/api/sales';
import { SalesBuyersPage } from '../src/desks/sales/SalesBuyersPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  listSalesBuyersPage: vi.fn(),
}));
vi.mock('../src/components/lead/LeadLookup', () => ({ LeadLookup: () => null }));

const row = (buyerId: string, firm: string) => ({
  buyerId,
  firm,
  gstin: null,
  pan: null,
  tehsil: null,
  district: null,
  tier: 'Dealer',
  assignedToEmployeeId: null,
  orderCount: 0,
  lastOrderAt: null,
  lastCalledAt: null,
  lastCalledBy: null,
  rateViews: 0,
  ownerName: 'Someone',
  contactName: null,
  mobile: null,
});

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
  vi.mocked(listSalesBuyersPage)
    .mockReset()
    .mockResolvedValue({
      items: [row('b1', 'Sharma Traders (Demo Buyer)')],
      total: 1,
      facets: { districts: [], assignees: [] },
    });
});

const lastCall = () => vi.mocked(listSalesBuyersPage).mock.calls.at(-1)![1];

function BuyerFileStub() {
  const navigate = useNavigate();
  return (
    <div>
      <p>Buyer file</p>
      <button onClick={() => navigate(-1)}>Back</button>
      <Link to="/sales/buyers">Buyers tab</Link>
    </div>
  );
}

function Url() {
  const location = useLocation();
  return <output aria-label="url">{location.pathname + location.search}</output>;
}

function renderApp(start = '/sales/buyers') {
  render(
    <MemoryRouter initialEntries={[start]}>
      <Url />
      <Routes>
        <Route path="/sales/buyers" element={<SalesBuyersPage />} />
        <Route path="/sales/buyers/:buyerId" element={<BuyerFileStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByLabelText('url').textContent;

describe('Sales → Buyers — the list survives opening a buyer (3 Nov, G1)', () => {
  it('type "Sharma", open the buyer, press Back: the search and the filtered table are still there', async () => {
    renderApp();
    fireEvent.change(await screen.findByLabelText('Search'), { target: { value: 'Sharma' } });
    await waitFor(() => expect(lastCall()).toMatchObject({ q: 'Sharma' }), { timeout: 3000 });
    await waitFor(() => expect(url()).toBe('/sales/buyers?q=Sharma'));

    fireEvent.click(await screen.findByText('Sharma Traders (Demo Buyer)'));
    expect(await screen.findByText('Buyer file')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByLabelText('Search')).toHaveValue('Sharma');
    await waitFor(() => expect(lastCall()).toMatchObject({ q: 'Sharma' }));
    expect(await screen.findByText('Sharma Traders (Demo Buyer)')).toBeInTheDocument();
  });

  it('filters and sort ride in the URL too, and come back with Back', async () => {
    renderApp();
    fireEvent.change(await screen.findByLabelText('Category'), { target: { value: 'Dealer' } });
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'rateViews' } });
    await waitFor(() =>
      expect(url()).toBe('/sales/buyers?category=Dealer&sort=rateViews&dir=desc'),
    );

    fireEvent.click(await screen.findByText('Sharma Traders (Demo Buyer)'));
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText('Category')).toHaveValue('Dealer');
    expect(screen.getByLabelText('Sort by')).toHaveValue('rateViews');
    await waitFor(() =>
      expect(lastCall()).toMatchObject({ category: 'Dealer', sort: 'rateViews', dir: 'desc' }),
    );
  });

  it('a shared link opens the list already filtered', async () => {
    renderApp('/sales/buyers?tab=queue&q=Abc&category=Retailer');
    expect(await screen.findByLabelText('Search')).toHaveValue('Abc');
    await waitFor(() =>
      expect(lastCall()).toMatchObject({ tab: 'queue', q: 'Abc', category: 'Retailer' }),
    );
  });

  it('the Buyers tab (a bare link) brings back the last filters; Clear filters drops them', async () => {
    renderApp('/sales/buyers?q=Abc&category=Dealer');
    await screen.findByText('Sharma Traders (Demo Buyer)');
    fireEvent.click(screen.getByText('Sharma Traders (Demo Buyer)'));
    fireEvent.click(await screen.findByRole('link', { name: 'Buyers tab' }));

    expect(await screen.findByLabelText('Search')).toHaveValue('Abc');
    expect(screen.getByLabelText('Category')).toHaveValue('Dealer');
    expect(url()).toBe('/sales/buyers?q=Abc&category=Dealer');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByLabelText('Search')).toHaveValue(''));
    expect(screen.getByLabelText('Category')).toHaveValue('');
    await waitFor(() => expect(url()).toBe('/sales/buyers'));
    await waitFor(() => expect(lastCall().q).toBeUndefined());

    // Cleared means cleared: coming back to the tab does not bring the old filters back.
    fireEvent.click(await screen.findByText('Sharma Traders (Demo Buyer)'));
    fireEvent.click(await screen.findByRole('link', { name: 'Buyers tab' }));
    expect(await screen.findByLabelText('Search')).toHaveValue('');
  });

  it('switching tab starts that tab on its own, and Back returns to the previous tab', async () => {
    renderApp('/sales/buyers?q=Abc');
    fireEvent.click(await screen.findByRole('button', { name: 'Queue' }));
    await waitFor(() => expect(url()).toBe('/sales/buyers?tab=queue'));
    expect(await screen.findByLabelText('Search')).toHaveValue('');
  });
});
