import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getSalesWorklist, getMarketPulse } from '../src/api/sales';
import { getUpcomingReceipts } from '../src/api/payment';
import { SalesTodayPage } from '../src/desks/sales/SalesTodayPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  getSalesWorklist: vi.fn(),
  getMarketPulse: vi.fn().mockResolvedValue([]),
}));
vi.mock('../src/api/payment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/payment')>()),
  getUpcomingReceipts: vi.fn().mockResolvedValue([]),
}));

const SHARMA = 'Sharma Traders (Demo Buyer)';
const DHAR = 'DEMO Dhar Kisan Bhandar';

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
  vi.mocked(getMarketPulse).mockResolvedValue([]);
  vi.mocked(getUpcomingReceipts).mockResolvedValue([]);
  const item = (
    refId: string,
    buyerId: string,
    buyerFirm: string,
    productName: string,
    extra = {},
  ) => ({
    bucket: 'he_asked' as const,
    refType: 'quote' as const,
    refId,
    buyerId,
    buyerFirm,
    productId: `p-${refId}`,
    productName,
    qty: 1,
    dueAt: '2026-10-20T07:33:00.000Z',
    ...extra,
  });
  // The order the server sends: Sharma's ask, then quotes for Dhar and Sharma interleaved.
  vi.mocked(getSalesWorklist).mockResolvedValue([
    item('a1', 'b-sharma', SHARMA, 'DEMO ThiaMax · Thiamethoxam 25% WG', {
      refType: 'ask',
      qty: 3,
      dueAt: undefined,
    }),
    item('q1', 'b-dhar', DHAR, 'DEMO AphidStop · Flonicamid 50% WG'),
    item('q2', 'b-dhar', DHAR, 'DEMO AphidStop · Flonicamid 50% WG'),
    item('q3', 'b-sharma', SHARMA, 'DEMO GrassOut · Quizalofop-ethyl 5% EC'),
    item('q4', 'b-sharma', SHARMA, 'DEMO WeedZero · 2,4-D Amine Salt 58% SL'),
  ]);
});

describe('Sales Today — one block per buyer (29 Oct)', () => {
  it("shows a buyer's name once, with each of his enquiries under it", async () => {
    render(
      <MemoryRouter>
        <SalesTodayPage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(SHARMA)).toHaveLength(1);
    expect(screen.getAllByText(DHAR)).toHaveLength(1);
    expect(screen.getByText('3 enquiries')).toBeInTheDocument();
    expect(screen.getByText('2 enquiries')).toBeInTheDocument();

    const sharmaBlock = screen.getByText(SHARMA).closest('[role="link"]') as HTMLElement;
    expect(sharmaBlock).toHaveTextContent('DEMO ThiaMax');
    expect(sharmaBlock).toHaveTextContent('DEMO GrassOut');
    expect(sharmaBlock).toHaveTextContent('DEMO WeedZero');
    expect(sharmaBlock).not.toHaveTextContent('DEMO AphidStop');

    // Sharma's block leads (his ask came first); each overdue line keeps its badge.
    const blocks = screen.getAllByRole('link').filter((el) => el.getAttribute('tabindex') === '0');
    expect(blocks[0]).toBe(sharmaBlock);
    expect(screen.getAllByText('overdue')).toHaveLength(4);
  });
});
