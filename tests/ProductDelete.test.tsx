import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import {
  deleteProduct,
  getAdminSkus,
  getAllProductsPage,
  getProductById,
  restoreProduct,
} from '../src/api/catalog';
import { ApiError } from '../src/api/errors';
import { ToastProvider } from '../src/components/ui/Toast';
import { ProductDetailPage } from '../src/desks/admin/ProductDetailPage';
import { ProductsPage } from '../src/desks/admin/ProductsPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/catalog', () => ({
  getProductById: vi.fn(),
  getAdminSkus: vi.fn(),
  getAllProductsPage: vi.fn(),
  deleteProduct: vi.fn(),
  restoreProduct: vi.fn(),
  updateProduct: vi.fn(),
  updateSku: vi.fn(),
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
  vi.mocked(getProductById).mockResolvedValue({
    productId: 'p1',
    brand: 'Roundup',
    technical: 'Glyphosate',
    hsn: '38089199',
    class: 'Medium',
    active: true,
    state: 'live',
  } as never);
  vi.mocked(getAdminSkus).mockResolvedValue([]);
  vi.mocked(deleteProduct).mockReset();
  vi.mocked(restoreProduct).mockReset().mockResolvedValue({ productId: 'p1' });
  vi.mocked(getAllProductsPage)
    .mockReset()
    .mockImplementation(async (_token, filter) =>
      filter.deleted
        ? {
            items: [
              {
                productId: 'p9',
                brand: 'Old Brand',
                technical: 'Atrazine',
                hsn: '38089199',
                class: 'Low',
                deletedAt: '2026-10-29T10:00:00.000Z',
                deletedByName: 'Test admin',
              },
            ],
            total: 1,
          }
        : { items: [], total: 0 },
    );
});

function renderDetail() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/manage/products/p1']}>
        <Routes>
          <Route path="/manage/products/:productId" element={<ProductDetailPage />} />
          <Route path="/manage/products" element={<p>Products list</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Manage → Products — soft delete (29 Oct)', () => {
  it('deletes after the confirm and goes back to the list', async () => {
    vi.mocked(deleteProduct).mockResolvedValue({ productId: 'p1' });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Past orders keep its name');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteProduct).toHaveBeenCalled());
    expect(vi.mocked(deleteProduct).mock.calls[0]![1]).toBe('p1');
    expect(await screen.findByText('Products list')).toBeInTheDocument();
  });

  it('says what is holding it when the server refuses', async () => {
    vi.mocked(deleteProduct).mockRejectedValue(
      new ApiError({
        code: 'PRODUCT_IN_USE',
        message: 'Roundup is still in use: 1 live listing.',
        meta: { reasons: ['1 live listing', '2 open asks'] },
      }),
    );
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Roundup is still in use');
    expect(alert).toHaveTextContent('1 live listing');
    expect(alert).toHaveTextContent('2 open asks');
    // 30 Oct — whom to ask, and what Active really does now.
    expect(alert).toHaveTextContent('Ask the seller to pause a live listing');
    expect(alert).toHaveTextContent('its listings drop off every board');
    expect(screen.queryByText('Products list')).toBeNull();
  });

  it('lists deleted products with who deleted them, and restores one', async () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <ProductsPage />
        </MemoryRouter>
      </ToastProvider>,
    );
    fireEvent.click(await screen.findByLabelText('Show deleted products'));
    expect(await screen.findByText('Old Brand')).toBeInTheDocument();
    expect(screen.getByText('by Test admin')).toBeInTheDocument();
    expect(vi.mocked(getAllProductsPage).mock.calls.at(-1)![1]).toMatchObject({ deleted: true });

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(restoreProduct).toHaveBeenCalled());
    expect(vi.mocked(restoreProduct).mock.calls[0]![1]).toBe('p9');
    expect(await screen.findByText(/Old Brand restored — inactive/)).toBeInTheDocument();
  });
});
