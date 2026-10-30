import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import {
  addProductPacks,
  getAdminSkus,
  getAllManufacturers,
  getHsnMasters,
  getProductById,
  getTechnicalMasters,
  updateProduct,
  updateSku,
} from '../src/api/catalog';
import { ToastProvider } from '../src/components/ui/Toast';
import { ProductDetailPage } from '../src/desks/admin/ProductDetailPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/catalog', () => ({
  getProductById: vi.fn(),
  getAdminSkus: vi.fn(),
  getTechnicalMasters: vi.fn(),
  getAllManufacturers: vi.fn(),
  getHsnMasters: vi.fn(),
  updateProduct: vi.fn(),
  updateSku: vi.fn(),
  addProductPacks: vi.fn(),
  createProduct: vi.fn(),
  createTechnical: vi.fn(),
  createManufacturer: vi.fn(),
  createHsn: vi.fn(),
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
    manufacturerId: 'm1',
    manufacturerName: 'Bharat Agro',
    hsn: '38089199',
    category: 'pesticide',
    taxPercent: 18,
    class: 'Medium',
    active: true,
    state: 'live',
  } as never);
  vi.mocked(getAdminSkus).mockResolvedValue([
    {
      skuId: 's1',
      packLabel: '500 ML',
      packSize: 0.5,
      baseUnit: 'LTR',
      unitsPerBox: 24,
      baseUnitsPerBox: 12,
      active: true,
      state: 'live',
      unit: 'ML',
      displaySize: 500,
    },
  ]);
  vi.mocked(getTechnicalMasters).mockResolvedValue([
    { technicalId: 't1', name: 'Glyphosate' },
  ] as never);
  vi.mocked(getAllManufacturers).mockResolvedValue([
    { manufacturerId: 'm1', name: 'Bharat Agro' },
  ] as never);
  vi.mocked(getHsnMasters).mockResolvedValue([{ code: '38089199', taxPercent: 18 }] as never);
  vi.mocked(updateProduct).mockReset().mockResolvedValue({ productId: 'p1' });
  vi.mocked(updateSku).mockReset().mockResolvedValue({ skuId: 's1', baseUnitsPerBox: 9 });
  vi.mocked(addProductPacks)
    .mockReset()
    .mockResolvedValue({ skuIds: ['s2'] });
});

function renderPage() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/manage/products/p1']}>
        <Routes>
          <Route path="/manage/products/:productId" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Product edit — the same form as create (24 Oct)', () => {
  it('shows packs as typed (500 ML), not 0.5 LTR', async () => {
    renderPage();
    expect(await screen.findByText('500 ML')).toBeInTheDocument();
    expect(screen.queryByText(/Added as/)).not.toBeInTheDocument();
  });

  it('edits a pack in its own unit (unit locked), adds a new pack, and saves each with a key', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Product/)).toHaveValue('Roundup');
    expect(screen.getByLabelText('Pack 1 size')).toHaveValue(500);
    expect(screen.getByLabelText('Pack 1 unit')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Pack 1 size'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: /add pack/i }));
    fireEvent.change(screen.getByLabelText('Pack 2 size'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Pack 2 units in box'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(addProductPacks).toHaveBeenCalled());
    const [, productId, fields, productKey] = vi.mocked(updateProduct).mock.calls[0]!;
    expect(productId).toBe('p1');
    expect(fields).toMatchObject({
      brand: 'Roundup',
      manufacturerId: 'm1',
      taxPercent: 18,
      active: true,
    });
    expect(productKey).toEqual(expect.any(String));
    expect(vi.mocked(updateSku).mock.calls[0]!.slice(1, 3)).toEqual([
      's1',
      { unit: 'ML', packSize: 750, unitsPerBox: 24, active: true },
    ]);
    expect(vi.mocked(addProductPacks).mock.calls[0]!.slice(1, 3)).toEqual([
      'p1',
      [{ packSize: 1, unit: 'LTR', unitsPerBox: 10 }],
    ]);
  });

  it('shows a missing field under the field and sends nothing, as create does', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(await screen.findByLabelText(/^Product/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Tax %/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('Enter the product name.')).toBeInTheDocument();
    expect(screen.getByText(/Enter the tax %/)).toBeInTheDocument();
    expect(updateProduct).not.toHaveBeenCalled();
  });
});
