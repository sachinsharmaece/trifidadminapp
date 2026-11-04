import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { proxyConfirmPile, proxyDeclinePile, proxyRequotePile } from '../src/api/proxy';
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
  vi.mocked(proxyDeclinePile)
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
const monthField = () => screen.getByLabelText(/^Expiry month/) as HTMLSelectElement;
const yearField = () => screen.getByLabelText(/^Expiry year/) as HTMLSelectElement;
const confirm = () => screen.getByRole('button', { name: 'Confirm' });
const note = (text = 'ok') =>
  fireEvent.change(screen.getByLabelText(/^Call note/), { target: { value: text } });
const confirmArgs = () => vi.mocked(proxyConfirmPile).mock.calls[0]![2];

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

describe('Expiry on the Confirm form (3 Nov — optional month and year dropdowns)', () => {
  it('is filled from his listing; confirming sends it as month/year', async () => {
    show({ listedExpiry: '06/2029' });
    expect(monthField().value).toBe('06');
    expect(yearField().value).toBe('2029');
    expect(
      screen.getByText('From his listing — change it only if it differs.'),
    ).toBeInTheDocument();
    note();
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalledTimes(1));
    expect(confirmArgs()).toEqual({
      sellerCounterpartyId: 'c1',
      canSendBoxes: 25,
      expiryExact: '06/2029',
      callNote: 'ok',
    });
  });

  it('a listed year alone preselects the year only', () => {
    show({ listedExpiry: '2029' });
    expect(monthField().value).toBe('');
    expect(yearField().value).toBe('2029');
  });

  it('cleared, leaves it to the listing', async () => {
    show({ listedExpiry: '2029' });
    fireEvent.change(yearField(), { target: { value: '' } });
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalled());
    expect(confirmArgs().expiryExact).toBeUndefined();
  });

  it('with none listed and none picked, Confirm is enabled and sends no expiry and no note', async () => {
    show({ listedExpiry: null });
    expect(confirm()).toBeEnabled();
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalledTimes(1));
    expect(confirmArgs()).toEqual({
      sellerCounterpartyId: 'c1',
      canSendBoxes: 25,
      expiryExact: undefined,
      callNote: '',
    });
  });

  it('a year alone, or a month and year, is sent in the form the server stores', async () => {
    const year = String(new Date().getFullYear() + 2);
    show({ listedExpiry: null });
    fireEvent.change(yearField(), { target: { value: year } });
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalledTimes(1));
    expect(confirmArgs().expiryExact).toBe(year);

    fireEvent.change(monthField(), { target: { value: '03' } });
    fireEvent.click(confirm());
    await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalledTimes(2));
    expect(vi.mocked(proxyConfirmPile).mock.calls[1]![2].expiryExact).toBe(`03/${year}`);
  });

  it('a month without a year is held back, with the reason', () => {
    show({ listedExpiry: null });
    fireEvent.change(monthField(), { target: { value: '03' } });
    expect(screen.getByText('Pick the year as well, or clear the month.')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    fireEvent.change(monthField(), { target: { value: '' } });
    expect(confirm()).toBeEnabled();
  });

  it('offers this year to six years on, and a listed year outside that range too', () => {
    const thisYear = new Date().getFullYear();
    show({ listedExpiry: '2020' });
    const years = Array.from(yearField().options)
      .map((o) => o.value)
      .filter(Boolean);
    expect(years[0]).toBe('2020');
    expect(years).toContain(String(thisYear));
    expect(years).toContain(String(thisYear + 6));
    expect(years).not.toContain(String(thisYear + 7));
  });
});

describe('Call note on the pile decision (3 Nov — optional)', () => {
  it('is labelled optional, and Confirm, Requote and Decline all go without it', async () => {
    show({ listedExpiry: null });
    expect(screen.getByLabelText('Call note (optional)')).not.toBeRequired();

    fireEvent.click(screen.getByRole('button', { name: 'Requote' }));
    await waitFor(() => expect(proxyRequotePile).toHaveBeenCalledTimes(1));
    expect(vi.mocked(proxyRequotePile).mock.calls[0]![2]).toEqual({
      sellerCounterpartyId: 'c1',
      callNote: '',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(proxyDeclinePile).toHaveBeenCalledTimes(1));
    expect(vi.mocked(proxyDeclinePile).mock.calls[0]![2]).toEqual({
      sellerCounterpartyId: 'c1',
      callNote: '',
    });
  });

  it('a typed note is trimmed and sent', async () => {
    show();
    note('  spoke to him  ');
    fireEvent.click(screen.getByRole('button', { name: 'Requote' }));
    await waitFor(() => expect(proxyRequotePile).toHaveBeenCalled());
    expect(vi.mocked(proxyRequotePile).mock.calls[0]![2].callNote).toBe('spoke to him');
  });
});

describe('Batch on the Confirm form (3 Nov — removed)', () => {
  it.each(['company', 'auth'] as const)(
    'there is no batch field for %s stock',
    async (provenance) => {
      show({ listedExpiry: '2029', provenance });
      expect(screen.queryByLabelText(/Batch/)).toBeNull();
      expect(confirm()).toBeEnabled();
      fireEvent.click(confirm());
      await waitFor(() => expect(proxyConfirmPile).toHaveBeenCalled());
      expect(confirmArgs()).not.toHaveProperty('batch');
    },
  );
});
