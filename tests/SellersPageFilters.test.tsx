import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getSupplyMatrixBySeller, type SupplyMatrixSellerRow } from '../src/api/purchase';
import { listRegistrationsPage } from '../src/api/onboarding';
import { SellersPage, filterSellers } from '../src/desks/purchase/SellersPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/purchase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/purchase')>()),
  getSupplyMatrixBySeller: vi.fn(),
}));
vi.mock('../src/api/onboarding', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/onboarding')>()),
  listRegistrationsPage: vi.fn(),
}));
// The exact-GSTIN lookup has its own card and tests; it must stay as it was.
vi.mock('../src/components/lead/LeadLookup', () => ({
  LeadLookup: () => <div>exact lookup</div>,
}));

const seller = (over: Partial<SupplyMatrixSellerRow>): SupplyMatrixSellerRow => ({
  sellerId: 's',
  firm: 'Firm',
  trustTier: 'New',
  district: 'Indore',
  assignedTo: 'Asha',
  assignedToEmployeeId: 'e1',
  carryCount: 2,
  listedCount: 1,
  manufacturerNames: ['Coromandel'],
  ownerName: 'Owner',
  mobile: '9000000000',
  gstin: '23AAAAA0000A1Z5',
  ...over,
});

const PANEL: SupplyMatrixSellerRow[] = [
  seller({
    sellerId: 's1',
    firm: 'Madhya Bharat Agro',
    ownerName: 'Ramesh Patel',
    mobile: '9876500001',
    gstin: '23BBBBB1111B1Z6',
    district: 'Ujjain',
    trustTier: 'Trusted',
    assignedTo: 'Asha',
    assignedToEmployeeId: 'e1',
    manufacturerNames: ['Atul', 'UPL'],
  }),
  seller({
    sellerId: 's2',
    firm: 'Narmada Traders',
    ownerName: 'Suresh Jain',
    mobile: '9876500002',
    gstin: '23CCCCC2222C1Z7',
    district: 'Indore',
    trustTier: 'New',
    assignedTo: null,
    assignedToEmployeeId: null,
    carryCount: 0,
    listedCount: 0,
    manufacturerNames: [],
  }),
  seller({
    sellerId: 's3',
    firm: 'Malwa Seeds',
    ownerName: 'Kavita Rao',
    mobile: '9876500003',
    gstin: '23DDDDD3333D1Z8',
    district: 'Indore',
    trustTier: 'Verified',
    assignedTo: 'Bharat',
    assignedToEmployeeId: 'e2',
    carryCount: 3,
    listedCount: 0,
    manufacturerNames: ['Coromandel'],
  }),
];

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
  vi.mocked(getSupplyMatrixBySeller).mockReset().mockResolvedValue(PANEL);
  vi.mocked(listRegistrationsPage)
    .mockReset()
    .mockResolvedValue({ items: [], total: 0 } as never);
});

const firms = (items: SupplyMatrixSellerRow[]) => items.map((s) => s.firm);
const base = { q: '', district: '', assigned: '', tier: '', carries: '', listed: '' };

describe('filterSellers', () => {
  it('searches firm, proprietor, mobile, GSTIN, district and company', () => {
    expect(firms(filterSellers(PANEL, { ...base, q: 'narmada' }))).toEqual(['Narmada Traders']);
    expect(firms(filterSellers(PANEL, { ...base, q: 'kavita' }))).toEqual(['Malwa Seeds']);
    expect(firms(filterSellers(PANEL, { ...base, q: '9876500001' }))).toEqual([
      'Madhya Bharat Agro',
    ]);
    expect(firms(filterSellers(PANEL, { ...base, q: '23ccccc2222' }))).toEqual(['Narmada Traders']);
    expect(firms(filterSellers(PANEL, { ...base, q: 'ujjain' }))).toEqual(['Madhya Bharat Agro']);
    expect(firms(filterSellers(PANEL, { ...base, q: 'upl' }))).toEqual(['Madhya Bharat Agro']);
    expect(filterSellers(PANEL, { ...base, q: 'zzz' })).toEqual([]);
  });

  it('filters by district, assignee (or the Queue), tier, carries and listed', () => {
    expect(firms(filterSellers(PANEL, { ...base, district: 'Indore' }))).toEqual([
      'Narmada Traders',
      'Malwa Seeds',
    ]);
    expect(firms(filterSellers(PANEL, { ...base, assigned: 'queue' }))).toEqual([
      'Narmada Traders',
    ]);
    expect(firms(filterSellers(PANEL, { ...base, assigned: 'e2' }))).toEqual(['Malwa Seeds']);
    expect(firms(filterSellers(PANEL, { ...base, tier: 'Trusted' }))).toEqual([
      'Madhya Bharat Agro',
    ]);
    expect(firms(filterSellers(PANEL, { ...base, carries: 'none' }))).toEqual(['Narmada Traders']);
    expect(firms(filterSellers(PANEL, { ...base, carries: 'has' }))).toEqual([
      'Madhya Bharat Agro',
      'Malwa Seeds',
    ]);
    expect(firms(filterSellers(PANEL, { ...base, listed: 'yes' }))).toEqual(['Madhya Bharat Agro']);
    expect(firms(filterSellers(PANEL, { ...base, listed: 'no' }))).toEqual([
      'Narmada Traders',
      'Malwa Seeds',
    ]);
  });

  it('combines filters, and a row missing the new fields still lists', () => {
    expect(
      firms(filterSellers(PANEL, { ...base, district: 'Indore', carries: 'has', listed: 'no' })),
    ).toEqual(['Malwa Seeds']);
    const old = seller({
      sellerId: 's9',
      firm: 'Old API',
      ownerName: undefined,
      mobile: undefined,
    });
    expect(firms(filterSellers([old], { ...base, q: 'old' }))).toEqual(['Old API']);
  });
});

function SellerFileStub() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
}
function Url() {
  const location = useLocation();
  return <output aria-label="url">{location.pathname + location.search}</output>;
}
function renderPage(start = '/purchase/sellers') {
  render(
    <MemoryRouter initialEntries={[start]}>
      <Url />
      <Routes>
        <Route path="/purchase/sellers" element={<SellersPage />} />
        <Route path="/purchase/sellers/:id" element={<SellerFileStub />} />
      </Routes>
    </MemoryRouter>,
  );
}
const url = () => screen.getByLabelText('url').textContent;

describe('Purchase → Sellers — "On the panel"', () => {
  it('shows every seller with a count, and leaves the exact-GSTIN lookup alone', async () => {
    renderPage();
    expect(await screen.findByText('Madhya Bharat Agro')).toBeInTheDocument();
    expect(screen.getByText('3 sellers')).toBeInTheDocument();
    expect(screen.getByText('exact lookup')).toBeInTheDocument();
  });

  it('search and filters narrow the table, with a result count and Clear filters', async () => {
    renderPage();
    await screen.findByText('Madhya Bharat Agro');
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'suresh' } });
    await waitFor(() => expect(screen.queryByText('Malwa Seeds')).toBeNull(), { timeout: 3000 });
    expect(screen.getByText('Narmada Traders')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 sellers')).toBeInTheDocument();
    await waitFor(() => expect(url()).toBe('/purchase/sellers?q=suresh'));

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('Malwa Seeds')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toHaveValue('');
    await waitFor(() => expect(url()).toBe('/purchase/sellers'));

    fireEvent.change(screen.getByLabelText('Assigned to'), { target: { value: 'queue' } });
    expect(screen.queryByText('Malwa Seeds')).toBeNull();
    expect(screen.getByText('Narmada Traders')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Assigned to'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Carries'), { target: { value: 'none' } });
    expect(screen.queryByText('Malwa Seeds')).toBeNull();
    expect(screen.getByText('Narmada Traders')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 sellers')).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    renderPage('/purchase/sellers?q=nobody');
    expect(await screen.findByText('No seller matches these filters.')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 sellers')).toBeInTheDocument();
  });

  it('opening a seller and pressing Back keeps the search', async () => {
    renderPage();
    await screen.findByText('Madhya Bharat Agro');
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'malwa' } });
    await waitFor(() => expect(url()).toBe('/purchase/sellers?q=malwa'), { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText('Search')).toHaveValue('malwa');
    expect(screen.queryByText('Narmada Traders')).toBeNull();
    expect(screen.getByText('Malwa Seeds')).toBeInTheDocument();
  });
});
