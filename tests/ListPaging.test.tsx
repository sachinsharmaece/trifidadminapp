import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { ToastProvider } from '../src/components/ui/Toast';
import { getAllProductsPage } from '../src/api/catalog';
import { listRegistrationsPage } from '../src/api/onboarding';
import { getSalesBoard } from '../src/api/sales';
import { ProductsPage } from '../src/desks/admin/ProductsPage';
import { SellersPage } from '../src/desks/purchase/SellersPage';
import { SalesProductsPage } from '../src/desks/sales/SalesProductsPage';
import type { ProductDto, RegistrationListItem } from '../src/api/dto';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/catalog')>()),
  getAllProductsPage: vi.fn(),
}));
vi.mock('../src/api/onboarding', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/onboarding')>()),
  listRegistrationsPage: vi.fn(),
}));
vi.mock('../src/api/purchase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/purchase')>()),
  getSupplyMatrixBySeller: vi.fn().mockResolvedValue([]),
}));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  getSalesBoard: vi.fn(),
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
});

const product = (n: number) =>
  ({
    productId: `p${n}`,
    brand: `Brand ${n}`,
    technical: 'Glyphosate',
    manufacturerId: 'm1',
    manufacturerName: 'Syngenta',
    hsn: '38089110',
    class: 'Medium',
    active: true,
    state: 'live',
  }) as ProductDto;

const wrap = (ui: React.ReactNode) =>
  render(
    <ToastProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ToastProvider>,
  );

describe('29 Oct — long lists page', () => {
  it('Manage → Products: the next page with the cursor, "Showing N of M", and server search', async () => {
    vi.mocked(getAllProductsPage)
      .mockReset()
      .mockImplementation(async (_t, filter) =>
        filter.cursor
          ? { items: [product(3)], total: 3 }
          : filter.q
            ? { items: [product(2)], total: 1 }
            : { items: [product(1), product(2)], nextCursor: 'c1', total: 3 },
      );
    wrap(<ProductsPage />);
    expect(await screen.findByText('Showing 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(await screen.findByText('Brand 3')).toBeInTheDocument();
    expect(vi.mocked(getAllProductsPage).mock.calls.at(-1)![1]).toMatchObject({ cursor: 'c1' });
    expect(screen.getByText(/Showing 3 of 3 — that is all/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search products'), { target: { value: 'Brand 2' } });
    await waitFor(() =>
      expect(vi.mocked(getAllProductsPage).mock.calls.at(-1)![1]).toMatchObject({ q: 'Brand 2' }),
    );
    await waitFor(() => expect(screen.queryByText('Brand 1')).toBeNull());
  });

  it('Purchase → Sellers, "Waiting on us": asks the server for sellers only, not the first 25 of everyone', async () => {
    vi.mocked(listRegistrationsPage)
      .mockReset()
      .mockResolvedValue({
        items: [
          {
            registrationId: 'r1',
            firm: 'Seller Firm',
            kind: 'seller',
            status: 'pending',
          } as RegistrationListItem,
        ],
        total: 1,
      });
    wrap(<SellersPage />);
    expect(await screen.findByText('Seller Firm')).toBeInTheDocument();
    expect(vi.mocked(listRegistrationsPage).mock.calls[0]![1]).toMatchObject({
      stage: 'pending',
      kind: 'seller',
    });
  });

  it('Sales → Products: 50 rows at a time from the loaded board, then the rest', async () => {
    vi.mocked(getSalesBoard)
      .mockReset()
      .mockResolvedValue(
        Array.from({ length: 60 }, (_, n) => ({
          productId: `b${n}`,
          brand: `Board ${n}`,
          technicalName: 'Glyphosate',
          manufacturerName: 'Syngenta',
          ladderCount: 1,
          cheapestRatePaise: 10000,
          buyerCount: 1,
        })) as never,
      );
    wrap(<SalesProductsPage />);
    expect(await screen.findByText('Showing 50 of 60')).toBeInTheDocument();
    expect(screen.queryByText('Board 55')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(await screen.findByText('Board 55')).toBeInTheDocument();
  });
});
