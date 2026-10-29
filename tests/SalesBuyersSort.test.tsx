import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { listSalesBuyersPage } from '../src/api/sales';
import { SalesBuyersPage } from '../src/desks/sales/SalesBuyersPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  listSalesBuyersPage: vi.fn(),
}));
// The lookup card searches on its own; not under test here.
vi.mock('../src/components/lead/LeadLookup', () => ({ LeadLookup: () => null }));

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
      items: [],
      total: 0,
      facets: { districts: [], assignees: [] },
    });
});

const lastCall = () => vi.mocked(listSalesBuyersPage).mock.calls.at(-1)![1];

describe('Sales → Buyers — sort (29 Oct)', () => {
  it('asks for firm A→Z first, then whatever Sort by / Order say', async () => {
    render(
      <MemoryRouter>
        <SalesBuyersPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(listSalesBuyersPage).toHaveBeenCalled());
    expect(lastCall()).toMatchObject({ sort: 'firm', dir: 'asc' });

    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'desc' } });
    await waitFor(() => expect(lastCall()).toMatchObject({ sort: 'firm', dir: 'desc' }));
    expect(screen.getByRole('option', { name: 'Z → A' })).toBeInTheDocument();

    // A fresh pick starts in its natural direction: most rate views first.
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'rateViews' } });
    await waitFor(() => expect(lastCall()).toMatchObject({ sort: 'rateViews', dir: 'desc' }));
    expect(screen.getByRole('option', { name: 'Most first' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'tehsil' } });
    await waitFor(() => expect(lastCall()).toMatchObject({ sort: 'tehsil', dir: 'asc' }));
  });
});
