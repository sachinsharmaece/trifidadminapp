import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { ApiError } from '../src/api/errors';
import { getShortPiles, resolveShortPile, type ShortPile } from '../src/api/sales';
import { ToastProvider } from '../src/components/ui/Toast';
import { ShortPilesSection } from '../src/desks/sales/ShortPilesSection';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  getShortPiles: vi.fn(),
  resolveShortPile: vi.fn(),
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
  vi.mocked(getShortPiles).mockReset();
  vi.mocked(resolveShortPile).mockReset();
});

const request = (n: number, firm: string, boxes: number) => ({
  pileRequestId: `r${n}`,
  buyerId: `b${n}`,
  firm,
  boxes,
  requestedAt: '2026-11-02T06:00:00.000Z',
});
const pile = (): ShortPile => ({
  pileId: 'p1',
  brand: 'ashitaka',
  packLabel: '50 GM',
  canSend: 10,
  asked: 15,
  decidedAt: '2026-11-02T07:00:00.000Z',
  requests: [
    request(1, 'Alpha Agro', 6),
    request(2, 'Beta Traders', 5),
    request(3, 'Gamma Seeds', 4),
  ],
});

const show = () =>
  render(
    <ToastProvider>
      <ShortPilesSection />
    </ToastProvider>,
  );
const box = (firm: string) => screen.getByLabelText(`Boxes for ${firm}`) as HTMLInputElement;

describe('Short piles on the Sales desk (BR-134)', () => {
  it('shows nothing when no pile is short', async () => {
    vi.mocked(getShortPiles).mockResolvedValue([]);
    const { container } = show();
    await waitFor(() => expect(getShortPiles).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('starts the division first come, first served, and says what is left for each buyer', async () => {
    vi.mocked(getShortPiles).mockResolvedValue([pile()]);
    show();
    expect(await screen.findByText(/He can send/)).toHaveTextContent(
      'He can send 10 of the 15 boxes asked for.',
    );
    expect(box('Alpha Agro').value).toBe('6');
    expect(box('Beta Traders').value).toBe('4');
    expect(box('Gamma Seeds').value).toBe('0');
    expect(screen.getByText('1 back on his ask')).toBeInTheDocument();
    expect(screen.getByText('4 back on his ask')).toBeInTheDocument();
    expect(screen.getByText(/Giving 10 of the 10 he can send/)).toBeInTheDocument();
  });

  it('will not divide more than he can send, or without a reason', async () => {
    vi.mocked(getShortPiles).mockResolvedValue([pile()]);
    show();
    await screen.findByText(/He can send/);
    const button = screen.getByRole('button', { name: 'Divide the boxes' });
    expect(button).toBeDisabled(); // Nothing written under "Why this split".

    fireEvent.change(screen.getByLabelText(/Why this split/), {
      target: { value: 'Regulars first.' },
    });
    expect(button).toBeEnabled();

    fireEvent.change(box('Gamma Seeds'), { target: { value: '2' } });
    expect(screen.getByText(/that is more than he can send/)).toBeInTheDocument();
    expect(button).toBeDisabled();

    fireEvent.change(box('Gamma Seeds'), { target: { value: '0' } });
    fireEvent.change(box('Beta Traders'), { target: { value: '2' } });
    expect(screen.getByText(/2 stay on his listing/)).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('sends every buyer with his boxes and the reason, then reloads the list', async () => {
    vi.mocked(getShortPiles).mockResolvedValueOnce([pile()]).mockResolvedValue([]);
    vi.mocked(resolveShortPile).mockResolvedValue({
      orderedBoxes: 10,
      backOnAskBoxes: 5,
      lineQty: 0,
    });
    show();
    await screen.findByText(/He can send/);
    fireEvent.change(box('Gamma Seeds'), { target: { value: '1' } });
    fireEvent.change(box('Beta Traders'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Why this split/), {
      target: { value: ' Two regulars. ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Divide the boxes' }));

    await waitFor(() => expect(resolveShortPile).toHaveBeenCalledTimes(1));
    expect(vi.mocked(resolveShortPile).mock.calls[0]![1]).toBe('p1');
    expect(vi.mocked(resolveShortPile).mock.calls[0]![2]).toEqual({
      allocations: [
        { pileRequestId: 'r1', boxes: 6 },
        { pileRequestId: 'r2', boxes: 3 },
        { pileRequestId: 'r3', boxes: 1 },
      ],
      reason: 'Two regulars.',
    });
    expect(await screen.findByText('10 boxes ordered; 5 are open as asks.')).toBeInTheDocument();
    await waitFor(() => expect(getShortPiles).toHaveBeenCalledTimes(2)); // The divided pile is gone.
    expect(screen.queryByText(/He can send/)).toBeNull();
  });

  it('shows what the server refused, and keeps the form', async () => {
    vi.mocked(getShortPiles).mockResolvedValue([pile()]);
    vi.mocked(resolveShortPile).mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'This short pile has already been divided.',
      }),
    );
    show();
    await screen.findByText(/He can send/);
    fireEvent.change(screen.getByLabelText(/Why this split/), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Divide the boxes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This short pile has already been divided.',
    );
    expect(screen.getByRole('button', { name: 'Divide the boxes' })).toBeEnabled();
  });
});
