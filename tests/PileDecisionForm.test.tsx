import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { proxyConfirmPile, proxyRequotePile } from '../src/api/proxy';
import { PileDecisionForm } from '../src/desks/purchase/PileDecisionForm';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/proxy', () => ({
  proxyConfirmPile: vi.fn(),
  proxyRequotePile: vi.fn(),
  proxyDeclinePile: vi.fn(),
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
  vi.mocked(proxyConfirmPile).mockReset().mockResolvedValue({ pileId: 'p1', undoWindowMs: 5000 });
  vi.mocked(proxyRequotePile)
    .mockReset()
    .mockResolvedValue(undefined as never);
});

const show = (
  over: Partial<{
    boxes: number;
    lineQty: number;
    listedExpiry: string | null;
    provenance: 'company' | 'auth';
  }> = {},
) => {
  const onDecided = vi.fn();
  render(
    <PileDecisionForm
      pileId="p1"
      sellerCounterpartyId="c1"
      boxes={66}
      lineQty={25}
      listedExpiry={null}
      provenance="company"
      onDecided={onDecided}
      {...over}
    />,
  );
  return onDecided;
};
const boxesField = () => screen.getByLabelText('Boxes he can send') as HTMLInputElement;
const expiryField = () => screen.getByLabelText(/^Expiry/) as HTMLInputElement;
const confirm = () => screen.getByRole('button', { name: 'Confirm' });
const note = (text = 'ok') =>
  fireEvent.change(screen.getByLabelText(/^Call note/), { target: { value: text } });

describe('Boxes he can send (2 Nov)', () => {
  it('starts at what he listed when buyers asked for more, and says so', () => {
    show({ boxes: 66, lineQty: 25 });
    expect(boxesField().value).toBe('25');
    expect(screen.getByText('He listed 25; buyers asked for 66.')).toBeInTheDocument();
  });

  it('starts at what buyers asked for when he listed enough', () => {
    show({ boxes: 5, lineQty: 25 });
    expect(boxesField().value).toBe('5');
  });
});

describe('Expiry on the Confirm form (BR-102)', () => {
  it('is filled from his listing and not required; confirming sends it', async () => {
    show({ listedExpiry: '06/2029' });
    expect(expiryField().value).toBe('06/2029');
    expect(
      screen.getByText('From his listing — change it only if it differs.'),
    ).toBeInTheDocument();
    note();
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalledTimes(1));
    expect(vi.mocked(proxyConfirmPile).mock.calls[0]![2]).toEqual({
      sellerCounterpartyId: 'c1',
      canSendBoxes: 25,
      expiryExact: '06/2029',
      batch: undefined,
      callNote: 'ok',
    });
  });

  it('cleared, leaves it to the listing', async () => {
    show({ listedExpiry: '2029' });
    fireEvent.change(expiryField(), { target: { value: '' } });
    note();
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalled());
    expect(vi.mocked(proxyConfirmPile).mock.calls[0]![2].expiryExact).toBeUndefined();
  });

  it('with none listed needs at least the year, and a year alone will do', async () => {
    show({ listedExpiry: null });
    note();
    expect(confirm()).toBeDisabled();

    fireEvent.change(expiryField(), { target: { value: '13/2029' } });
    expect(screen.getByText(/Give the expiry as a year \(2028\)/)).toBeInTheDocument();
    expect(confirm()).toBeDisabled();

    fireEvent.change(expiryField(), { target: { value: '2029' } });
    expect(confirm()).toBeEnabled();
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalled());
    expect(vi.mocked(proxyConfirmPile).mock.calls[0]![2].expiryExact).toBe('2029');
  });

  it('does not hold up a requote', async () => {
    show({ listedExpiry: null });
    note();
    fireEvent.click(screen.getByRole('button', { name: 'Requote' }));
    await waitFor(() => expect(proxyRequotePile).toHaveBeenCalledTimes(1));
  });
});

describe('Batch on the Confirm form (BR-105)', () => {
  it('is not shown for company billing, and is not sent', async () => {
    show({ listedExpiry: '2029', provenance: 'company' });
    expect(screen.queryByLabelText(/Batch/)).toBeNull();
    note();
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalled());
    expect(vi.mocked(proxyConfirmPile).mock.calls[0]![2].batch).toBeUndefined();
  });

  it('is asked for, and required, on My stock', async () => {
    show({ listedExpiry: '2029', provenance: 'auth' });
    note();
    expect(confirm()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Batch/), { target: { value: ' B-7 ' } });
    expect(confirm()).toBeEnabled();
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalled());
    expect(vi.mocked(proxyConfirmPile).mock.calls[0]![2].batch).toBe('B-7');
  });
});
