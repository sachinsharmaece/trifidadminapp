import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { getProductMargin, getProductMarginHistory, setProductMargin } from '../src/api/pricing';
import { ToastProvider } from '../src/components/ui/Toast';
import { ProductMarginCard } from '../src/desks/admin/ProductMarginCard';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/pricing', () => ({
  getProductMargin: vi.fn(),
  getProductMarginHistory: vi.fn(),
  setProductMargin: vi.fn(),
}));

function signInWith(permissions: string[]) {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: (permission: string) => permissions.includes(permission),
    status: 'authenticated',
    me: null,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
}

const retailerRow = {
  productMarginId: 'r1',
  productId: 'p1',
  tier: 'Retailer' as const,
  marginPaise: 900,
  effectiveFrom: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
};

function renderCard() {
  render(
    <ToastProvider>
      <ProductMarginCard productId="p1" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  signInWith(['margin_matrix:read', 'margin_matrix:write']);
  vi.mocked(getProductMargin).mockReset().mockResolvedValue([retailerRow]);
  vi.mocked(getProductMarginHistory).mockReset().mockResolvedValue([retailerRow]);
  vi.mocked(setProductMargin).mockReset().mockResolvedValue([]);
});

describe('Product margin card (₹)', () => {
  it('shows the saved rupee value and leaves the other client types on the class margin', async () => {
    renderCard();
    const retailer = await screen.findByLabelText('Retailer margin for this product, rupees');
    expect(retailer).toHaveValue(9);
    expect(screen.getByLabelText('Dealer margin for this product, rupees')).toHaveValue(null);
    expect(screen.getByText('₹9.00')).toBeInTheDocument(); // the history row
  });

  it('saves a changed tier in paise, and a blank tier as null (back to the class margin)', async () => {
    renderCard();
    fireEvent.change(await screen.findByLabelText('Dealer margin for this product, rupees'), {
      target: { value: '6.5' },
    });
    fireEvent.change(screen.getByLabelText('Retailer margin for this product, rupees'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save 2 changes/i }));

    await waitFor(() => expect(setProductMargin).toHaveBeenCalledTimes(1));
    const [, productId, body, idempotencyKey] = vi.mocked(setProductMargin).mock.calls[0]!;
    expect(productId).toBe('p1');
    expect(idempotencyKey).toEqual(expect.any(String));
    expect(body.cells).toEqual([
      { tier: 'Retailer', marginPaise: null },
      { tier: 'Dealer', marginPaise: 650 },
    ]);
  });

  it('refuses a fraction of a paisa and does not call the server', async () => {
    renderCard();
    fireEvent.change(await screen.findByLabelText('Dealer margin for this product, rupees'), {
      target: { value: '6.505' },
    });
    // The browser's own step check would stop a click first; submit the form to reach our guard.
    fireEvent.submit(screen.getByRole('button', { name: /save 1 change/i }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(/at most two decimals/i);
    expect(setProductMargin).not.toHaveBeenCalled();
  });

  it('is read-only without the write permission', async () => {
    signInWith(['margin_matrix:read']);
    renderCard();
    expect(await screen.findByText('₹9')).toBeInTheDocument();
    expect(screen.queryByLabelText('Retailer margin for this product, rupees')).toBeNull();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('is not shown, and loads nothing, without the margin permission', () => {
    signInWith([]);
    renderCard();
    expect(screen.queryByText('Product margin (₹)')).toBeNull();
    expect(getProductMargin).not.toHaveBeenCalled();
  });
});
