import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { proxyAcceptAskFill } from '../src/api/proxy';
import { ToastProvider } from '../src/components/ui/Toast';
import { ConfirmRateButton } from '../src/desks/sales/BuyerStageActions';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/proxy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/proxy')>()),
  proxyAcceptAskFill: vi.fn(),
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
  vi.mocked(proxyAcceptAskFill).mockReset();
});

const quote = (qtyAvailable: number, askQty: number) =>
  ({
    quoteId: 'q1',
    askId: 'a1',
    brand: 'ashitaka',
    packLabel: '50 GM',
    qtyAvailable,
    askQty,
  }) as never;

function open(qtyAvailable: number, askQty: number) {
  render(
    <ToastProvider>
      <ConfirmRateButton quote={quote(qtyAvailable, askQty)} counterpartyId="c1" onDone={vi.fn()} />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  return screen.findByRole('dialog');
}

describe('Confirming a rate that covers fewer boxes than he asked for (2 Nov, BR-127)', () => {
  it('offers to keep the rest open, ticked by default, and says how many', async () => {
    vi.mocked(proxyAcceptAskFill).mockResolvedValue({
      soIds: ['so1'],
      filledBoxes: 10,
      remainingBoxes: 90,
    });
    const dialog = await open(10, 100);
    const box = within(dialog).getByRole('checkbox');
    expect(box).toBeChecked();
    expect(dialog).toHaveTextContent('Keep the remaining 90 boxes open');
    expect(dialog).toHaveTextContent('He asked for 100 and this covers 10');

    fireEvent.change(within(dialog).getByLabelText(/^Call note/), {
      target: { value: 'Takes 10.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm and raise the order/i }));
    await waitFor(() => expect(proxyAcceptAskFill).toHaveBeenCalled());
    expect(vi.mocked(proxyAcceptAskFill).mock.calls[0]![2]).toMatchObject({
      option: 'partial',
      quoteIds: ['q1'],
      keepRemainderOpen: true,
    });
    expect(
      await screen.findByText(/Order raised for 10 boxes .* 90 still open under He asked/),
    ).toBeInTheDocument();
  });

  it('unticking it closes the ask with what is ordered', async () => {
    vi.mocked(proxyAcceptAskFill).mockResolvedValue({
      soIds: ['so1'],
      filledBoxes: 10,
      remainingBoxes: 90,
    });
    const dialog = await open(10, 100);
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.change(within(dialog).getByLabelText(/^Call note/), {
      target: { value: 'Only 10.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm and raise the order/i }));
    await waitFor(() => expect(proxyAcceptAskFill).toHaveBeenCalled());
    expect(vi.mocked(proxyAcceptAskFill).mock.calls[0]![2]).toMatchObject({
      keepRemainderOpen: false,
    });
    expect(await screen.findByText('Order raised — now in Payment pending.')).toBeInTheDocument();
  });

  it('a full quote has no such box', async () => {
    vi.mocked(proxyAcceptAskFill).mockResolvedValue({
      soIds: ['so1'],
      filledBoxes: 100,
      remainingBoxes: 0,
    });
    const dialog = await open(100, 100);
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/^Call note/), { target: { value: 'Full.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm and raise the order/i }));
    await waitFor(() => expect(proxyAcceptAskFill).toHaveBeenCalled());
    const body = vi.mocked(proxyAcceptAskFill).mock.calls[0]![2];
    expect(body.option).toBe('full');
    expect(body).not.toHaveProperty('keepRemainderOpen');
  });
});
