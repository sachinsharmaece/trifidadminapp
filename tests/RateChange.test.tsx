import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { proxyAcceptAskFill } from '../src/api/proxy';
import { decideRateChange, requestRateChange, withdrawRateChange } from '../src/api/sales';
import type { BuyerFileRateChange } from '../src/api/sales';
import { ToastProvider } from '../src/components/ui/Toast';
import {
  ChangeRateButton,
  ConfirmRateButton,
  DecideRateChangeButtons,
  RateChangeNote,
  WithdrawRateChangeButton,
} from '../src/desks/sales/BuyerStageActions';

/** 4 Nov — Rate given → Change: ask, approve or reject, withdraw, and Confirm at the approved figures. */

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/proxy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/proxy')>()),
  proxyAcceptAskFill: vi.fn(),
}));
vi.mock('../src/api/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/sales')>()),
  requestRateChange: vi.fn(),
  decideRateChange: vi.fn(),
  withdrawRateChange: vi.fn(),
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
  vi.mocked(requestRateChange).mockReset();
  vi.mocked(decideRateChange).mockReset();
  vi.mocked(withdrawRateChange).mockReset();
});

const change = (overrides: Partial<BuyerFileRateChange> = {}): BuyerFileRateChange => ({
  requestId: 'r1',
  status: 'pending',
  boxes: 6,
  ratePaise: 140000,
  shownRatePaise: 136342,
  reasonCode: 'first_order_with_buyer',
  callNote: 'First order, wants it sharper.',
  requestedByName: 'Asha',
  requestedAt: '2026-11-04T09:00:00.000Z',
  decidedByName: null,
  decisionNote: '',
  canDecide: true,
  canWithdraw: true,
  ...overrides,
});

const quote = (rateChange: BuyerFileRateChange | null = null) =>
  ({
    quoteId: 'q1',
    askId: 'a1',
    brand: 'ACEMAIN',
    packLabel: '1 KG',
    ratePaise: 136342,
    qtyAvailable: 10,
    askQty: 10,
    rateChange,
  }) as never;

const note = (dialog: HTMLElement, value: string) =>
  fireEvent.change(within(dialog).getByLabelText(/^Call note/), { target: { value } });

describe('Change — asking for other boxes or another rate', () => {
  async function open() {
    render(
      <ToastProvider>
        <ChangeRateButton
          what="ACEMAIN · 1 KG"
          shownPaise={136342}
          maxBoxes={10}
          send={(token, input) => requestRateChange(token, 'q1', input)}
          onDone={vi.fn()}
        />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    return screen.findByRole('dialog');
  }

  it('starts from what he was shown and will not send until something is different', async () => {
    const dialog = await open();
    expect(within(dialog).getByLabelText(/^Boxes/)).toHaveValue(10);
    expect(within(dialog).getByLabelText(/^Rate/)).toHaveValue(1363.42);
    expect(within(dialog).getByRole('button', { name: 'Ask for approval' })).toBeDisabled();
    // The reason is asked for only once the rate itself moves.
    expect(within(dialog).queryByLabelText(/Why the rate changes/)).toBeNull();
  });

  it('boxes alone: no reason needed, and the rate goes as he was shown it', async () => {
    vi.mocked(requestRateChange).mockResolvedValue({ requestId: 'r1' });
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText(/^Boxes/), { target: { value: '6' } });
    note(dialog, 'Takes six.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ask for approval' }));
    await waitFor(() => expect(requestRateChange).toHaveBeenCalled());
    const [, quoteId, body] = vi.mocked(requestRateChange).mock.calls[0]!;
    expect(quoteId).toBe('q1');
    expect(body).toEqual({ boxes: 6, ratePaise: 136342, callNote: 'Takes six.' });
    expect(await screen.findByText(/Sent for approval/)).toBeInTheDocument();
  });

  it('a new rate needs a reason, and goes in paise — up or down', async () => {
    vi.mocked(requestRateChange).mockResolvedValue({ requestId: 'r1' });
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText(/^Rate/), { target: { value: '1400' } });
    const submit = within(dialog).getByRole('button', { name: 'Ask for approval' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Why the rate changes/), {
      target: { value: 'near_expiry' },
    });
    expect(submit).toBeEnabled();
    note(dialog, 'Near expiry, he will take it at 1400.');
    fireEvent.click(submit);
    await waitFor(() => expect(requestRateChange).toHaveBeenCalled());
    expect(vi.mocked(requestRateChange).mock.calls[0]![2]).toEqual({
      boxes: 10,
      ratePaise: 140000,
      reasonCode: 'near_expiry',
      callNote: 'Near expiry, he will take it at 1400.',
    });
  });

  it('more boxes than the quote can give is not sendable', async () => {
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText(/^Boxes/), { target: { value: '11' } });
    expect(within(dialog).getByRole('button', { name: 'Ask for approval' })).toBeDisabled();
  });

  it('is off when no margin is set for his tier (no rate to change)', () => {
    render(
      <ToastProvider>
        <ChangeRateButton
          what="ACEMAIN · 1 KG"
          shownPaise={null}
          maxBoxes={10}
          send={vi.fn()}
          onDone={vi.fn()}
        />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
  });

  it('once his 24-hour hold has ended it is off, and says so', () => {
    render(
      <ToastProvider>
        <ChangeRateButton
          what="ACEMAIN · 1 KG"
          shownPaise={136342}
          maxBoxes={10}
          holdEnded
          send={vi.fn()}
          onDone={vi.fn()}
        />
      </ToastProvider>,
    );
    expect(screen.getByText('Hold ended')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
  });
});

describe('Approve or reject — his Sales Leader (or Admin)', () => {
  async function open(button: 'Approve' | 'Reject') {
    render(
      <ToastProvider>
        <DecideRateChangeButtons change={change()} onDone={vi.fn()} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: button }));
    return screen.findByRole('dialog');
  }

  it('shows what is asked, and approving needs no note', async () => {
    vi.mocked(decideRateChange).mockResolvedValue({});
    const dialog = await open('Approve');
    expect(dialog).toHaveTextContent('Asha asks to confirm 6 boxes at ₹1,400.00');
    expect(dialog).toHaveTextContent('He was shown ₹1,363.42');
    expect(dialog).toHaveTextContent('First order with this buyer');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(decideRateChange).toHaveBeenCalled());
    expect(vi.mocked(decideRateChange).mock.calls[0]!.slice(1)).toEqual([
      'r1',
      { decision: 'approved', note: '' },
    ]);
  });

  it('rejecting needs a reason in the note', async () => {
    vi.mocked(decideRateChange).mockResolvedValue({});
    const dialog = await open('Reject');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(decideRateChange).not.toHaveBeenCalled();

    note(dialog, 'Too deep a cut for a first order.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(decideRateChange).toHaveBeenCalled());
    expect(vi.mocked(decideRateChange).mock.calls[0]!.slice(1)).toEqual([
      'r1',
      { decision: 'rejected', note: 'Too deep a cut for a first order.' },
    ]);
  });
});

describe('Withdraw — the requester takes it back', () => {
  it('asks to withdraw it, with no note needed', async () => {
    vi.mocked(withdrawRateChange).mockResolvedValue({});
    render(
      <ToastProvider>
        <WithdrawRateChangeButton requestId="r1" onDone={vi.fn()} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw request' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw request' }));
    await waitFor(() => expect(withdrawRateChange).toHaveBeenCalled());
    expect(vi.mocked(withdrawRateChange).mock.calls[0]![1]).toBe('r1');
  });
});

describe('Confirm — after it is approved', () => {
  async function open(approved: BuyerFileRateChange) {
    render(
      <ToastProvider>
        <ConfirmRateButton quote={quote(approved)} counterpartyId="c1" onDone={vi.fn()} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    return screen.findByRole('dialog');
  }

  it('says what was approved, spends the approval, and counts the rest of the ask from the approved boxes', async () => {
    vi.mocked(proxyAcceptAskFill).mockResolvedValue({
      soIds: ['so1'],
      filledBoxes: 6,
      remainingBoxes: 4,
    });
    const dialog = await open(change({ status: 'approved', decidedByName: 'Leader Lal' }));
    expect(dialog).toHaveTextContent('Approved by Leader Lal');
    expect(dialog).toHaveTextContent('6 boxes at ₹1,400.00');
    // He asked for 10; the approved order covers 6.
    expect(dialog).toHaveTextContent('Keep the remaining 4 boxes open');
    expect(dialog).toHaveTextContent('He asked for 10 and this covers 6');

    note(dialog, 'He confirmed on the call.');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm and raise the order/i }));
    await waitFor(() => expect(proxyAcceptAskFill).toHaveBeenCalled());
    // Only the approval id goes — never raw boxes or a rate.
    const body = vi.mocked(proxyAcceptAskFill).mock.calls[0]![2];
    expect(body).toMatchObject({
      option: 'partial',
      quoteIds: ['q1'],
      approvalId: 'r1',
      keepRemainderOpen: true,
    });
    expect(body).not.toHaveProperty('boxes');
    expect(body).not.toHaveProperty('ratePaise');
  });

  it('a Confirm with no approved change carries no approval id', async () => {
    vi.mocked(proxyAcceptAskFill).mockResolvedValue({
      soIds: ['so1'],
      filledBoxes: 10,
      remainingBoxes: 0,
    });
    render(
      <ToastProvider>
        <ConfirmRateButton
          quote={quote(change({ status: 'rejected' }))}
          counterpartyId="c1"
          onDone={vi.fn()}
        />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    const dialog = await screen.findByRole('dialog');
    note(dialog, 'As shown.');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm and raise the order/i }));
    await waitFor(() => expect(proxyAcceptAskFill).toHaveBeenCalled());
    expect(vi.mocked(proxyAcceptAskFill).mock.calls[0]![2]).not.toHaveProperty('approvalId');
  });
});

describe('The note under the product', () => {
  it('says who asked, why, and who decided', () => {
    render(
      <RateChangeNote
        change={change({
          status: 'rejected',
          decidedByName: 'Leader Lal',
          decisionNote: 'Too deep a cut.',
        })}
      />,
    );
    expect(screen.getByText('Change rejected')).toBeInTheDocument();
    expect(screen.getByText(/6 boxes at ₹1,400.00/)).toBeInTheDocument();
    expect(screen.getByText(/Asked by Asha — First order with this buyer/)).toBeInTheDocument();
    expect(screen.getByText(/Rejected by Leader Lal: “Too deep a cut.”/)).toBeInTheDocument();
  });
});
