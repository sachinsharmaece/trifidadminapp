import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getActiveDemandByProduct, getAskSellerStates } from '../src/api/purchase';
import { DemandPage } from '../src/desks/purchase/DemandPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/purchase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/purchase')>()),
  getActiveDemandByProduct: vi.fn(),
  getAskSellerStates: vi.fn(),
}));

const counts = (active: number) => ({ quoted: 0, active, dormant: 0, dark: 0 });
const ask = (askId: string, qty: number, packLabel: string | null, expiryBand = 'over12') => ({
  askId,
  qty,
  skuId: packLabel ? `s-${askId}` : null,
  productId: packLabel ? null : 'p1',
  createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  sellerCounts: counts(1),
  noSeller: false,
  brand: 'VESTA',
  technical: 'Clodinafop',
  manufacturerName: 'Co',
  packLabel,
  expiryBand,
  deliveryBand: null,
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
  vi.mocked(getAskSellerStates).mockResolvedValue([]);
  vi.mocked(getActiveDemandByProduct).mockResolvedValue([
    {
      productId: 'p1',
      brand: 'VESTA',
      technical: 'Clodinafop',
      manufacturerName: 'Co',
      askCount: 3,
      totalBoxes: 147,
      sellerCounts: counts(1),
      noSeller: false,
      asks: [ask('a1', 30, '100 GM'), ask('a2', 100, '500 GM', 'under12'), ask('a3', 17, null)],
    },
  ]);
});

describe('Purchase → Demand — one row per product (30 Oct, BR-371)', () => {
  it('shows the product once with its total, and opens to each ask', async () => {
    render(
      <MemoryRouter>
        <DemandPage />
      </MemoryRouter>,
    );
    const product = await screen.findByText(/VESTA · Clodinafop/);
    expect(screen.getAllByText(/VESTA · Clodinafop/)).toHaveLength(1);
    expect(screen.getByText('3 asks')).toBeInTheDocument();
    expect(screen.getByText('147')).toBeInTheDocument();
    expect(screen.queryByText(/100 GM/)).toBeNull();

    fireEvent.click(product);
    expect(screen.getByText(/100 GM · /)).toBeInTheDocument();
    expect(screen.getByText(/500 GM · /)).toBeInTheDocument();
    expect(screen.getByText(/All packs · /)).toBeInTheDocument();
    expect(screen.getAllByText('asked 3 days ago')).toHaveLength(3);

    // An ask still opens to its own sellers (Chase / Raise quote live there).
    fireEvent.click(screen.getByText(/500 GM · /));
    await waitFor(() => expect(getAskSellerStates).toHaveBeenCalled());
    expect(vi.mocked(getAskSellerStates).mock.calls[0]![1]).toBe('a2');
  });
});
