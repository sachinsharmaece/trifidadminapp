import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { ApiError } from '../src/api/errors';
import { getPilesConfirmedNotCompleted, type PileNotCompletedItem } from '../src/api/purchase';
import { StuckConfirmationsSection } from '../src/desks/purchase/StuckConfirmationsSection';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/purchase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/purchase')>()),
  getPilesConfirmedNotCompleted: vi.fn(),
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
  vi.mocked(getPilesConfirmedNotCompleted).mockReset();
});

const item = (over: Partial<PileNotCompletedItem> = {}): PileNotCompletedItem => ({
  pileId: 'p1',
  sellerId: 's1',
  sellerFirm: 'TriFid Stores Pvt. Ltd',
  packLabel: '500 ML',
  brand: 'WEEDMAR SUPER',
  boxes: 20,
  buyers: 2,
  confirmedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
  minutesSinceConfirmed: 40,
  lastError: null,
  retrying: true,
  ...over,
});

describe('Purchase › Confirmations — confirmed, deal not given yet', () => {
  it('shows nothing when no confirmation is stuck', async () => {
    vi.mocked(getPilesConfirmedNotCompleted).mockResolvedValue([]);
    const { container } = render(<StuckConfirmationsSection />);
    await waitFor(() => expect(getPilesConfirmedNotCompleted).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('lists a stuck confirmation with its boxes, buyer count and how long ago it was confirmed', async () => {
    vi.mocked(getPilesConfirmedNotCompleted).mockResolvedValue([item()]);
    render(<StuckConfirmationsSection />);

    expect(
      await screen.findByText('Confirmed, but the buyers have not been given their deal'),
    ).toBeInTheDocument();
    const row = screen.getByText('TriFid Stores Pvt. Ltd').closest('tr')!;
    expect(within(row).getByText(/WEEDMAR SUPER 500 ML/)).toBeInTheDocument();
    expect(within(row).getByText('20')).toBeInTheDocument();
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('40 minutes ago')).toBeInTheDocument();
    expect(within(row).getByText('Retrying')).toBeInTheDocument();
  });

  it('shows the last error a retry hit', async () => {
    vi.mocked(getPilesConfirmedNotCompleted).mockResolvedValue([
      item({ lastError: 'Listing line not found.' }),
    ]);
    render(<StuckConfirmationsSection />);
    expect(await screen.findByText('Listing line not found.')).toBeInTheDocument();
  });

  it('says it needs a decision once it is past its 24 hours', async () => {
    vi.mocked(getPilesConfirmedNotCompleted).mockResolvedValue([
      item({ retrying: false, minutesSinceConfirmed: 2000 }),
    ]);
    render(<StuckConfirmationsSection />);
    expect(await screen.findByText('Needs a decision')).toBeInTheDocument();
    expect(screen.queryByText('Retrying')).toBeNull();
  });

  it('never blocks the page when it cannot load', async () => {
    vi.mocked(getPilesConfirmedNotCompleted).mockRejectedValue(
      new ApiError({ code: 'PERMISSION_DENIED', message: 'No.' }),
    );
    const { container } = render(<StuckConfirmationsSection />);
    await waitFor(() => expect(getPilesConfirmedNotCompleted).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
