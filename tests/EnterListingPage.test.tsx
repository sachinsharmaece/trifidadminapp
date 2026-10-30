import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getSellerFile, postSellerCatalogueEntry } from '../src/api/purchase';
import { searchProducts } from '../src/api/catalog';
import { proxyCreateListing } from '../src/api/proxy';
import { EnterListingPage } from '../src/desks/purchase/EnterListingPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/purchase', () => ({
  getSellerFile: vi.fn(),
  postSellerCatalogueEntry: vi.fn(),
}));
vi.mock('../src/api/catalog', () => ({ searchProducts: vi.fn() }));
vi.mock('../src/api/proxy', () => ({ proxyCreateListing: vi.fn() }));

const item = (over: Record<string, unknown>) => ({
  entryId: null,
  source: 'dealership',
  technical: 'Metalaxyl',
  manufacturerName: 'Syngenta',
  productState: 'live',
  manufacturerState: 'live',
  productActive: true,
  packsDetailed: false,
  setAt: '2026-10-24T00:00:00.000Z',
  setBy: null,
  ...over,
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
  vi.mocked(getSellerFile)
    .mockReset()
    .mockResolvedValue({
      sellerId: 's1',
      counterpartyId: 'c1',
      firm: 'Madhya Bharat Agro',
      catalogue: [
        item({
          productId: 'p1',
          brand: 'zura',
          packs: [
            {
              skuId: 'k1',
              packLabel: '1 LTR',
              skuState: 'live',
              listed: false,
              listingRatePaise: null,
            },
          ],
        }),
        item({ productId: 'p2', brand: 'kem', packs: [] }),
      ],
    } as never);
  vi.mocked(searchProducts)
    .mockReset()
    .mockResolvedValue([{ productId: 'p9', brand: 'redomil gold', technical: 'Metalaxyl' }]);
  vi.mocked(postSellerCatalogueEntry).mockReset().mockResolvedValue({ entryId: 'e1' });
  vi.mocked(proxyCreateListing)
    .mockReset()
    .mockResolvedValue({ listingId: 'l1' } as never);
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/purchase/sellers/s1/listing/new']}>
      <Routes>
        <Route path="/purchase/sellers/:id/listing/new" element={<EnterListingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function pick(typed: string, option: RegExp) {
  const box = await screen.findByRole('combobox', { name: /^product/i });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: typed } });
  fireEvent.mouseDown(await screen.findByRole('option', { name: option }));
}

describe('Enter a listing — pick the product first (25 Oct)', () => {
  it('a product he carries offers its packs (one pack is picked for you)', async () => {
    renderPage();
    await pick('zura', /zura/);
    expect(screen.getByLabelText(/^Pack/)).toHaveValue('k1');
  });

  it('a product he does not carry yet can be added to his catalogue from here', async () => {
    renderPage();
    await pick('redomil', /redomil gold/);
    expect(await screen.findByText(/doesn.t carry redomil gold yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add to his catalogue/i }));
    await waitFor(() => expect(postSellerCatalogueEntry).toHaveBeenCalled());
    const [, input, key] = vi.mocked(postSellerCatalogueEntry).mock.calls[0]!;
    expect(input).toEqual({ sellerId: 's1', productId: 'p9' });
    expect(key).toEqual(expect.any(String));
    await waitFor(() => expect(getSellerFile).toHaveBeenCalledTimes(2));
  });

  it('a product he carries but cannot be listed says why, instead of vanishing', async () => {
    renderPage();
    await pick('kem', /kem/);
    expect(await screen.findByText(/no active pack yet/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Pack/)).toBeDisabled();
  });
});
