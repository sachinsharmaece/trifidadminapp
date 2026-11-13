import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import * as holding from '../src/api/holding';
import { PoolTab } from '../src/components/holding/PoolTab';
import { ClocksGroup } from '../src/components/holding/ClocksGroup';
import { DormantPolicyPage } from '../src/desks/admin/DormantPolicyPage';
import {
  callDueText,
  clockText,
  placeText,
  releasingText,
} from '../src/components/holding/holdingFormat';
import { isPlaceholderMobile } from '../src/lib/validators';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/holding', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/holding')>()),
  getHoldingStatus: vi.fn(),
  getPool: vi.fn(),
  claimParty: vi.fn(),
  getMyHoldings: vi.fn(),
  getPolicy: vi.fn(),
  updatePolicy: vi.fn(),
}));

const CALLER = { enabled: true, isCaller: true, isTeamLeader: false, uncalledCap: 50 };

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => true,
    status: 'authenticated',
    me: { employeeId: 'e1', person: 'Caller', roles: [], permissions: [] } as never,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
  vi.mocked(holding.getHoldingStatus).mockResolvedValue(CALLER);
});

const card = (over: Partial<holding.PoolCard> = {}): holding.PoolCard => ({
  buyerId: 'b1',
  firm: 'Far Away Agro',
  tehsil: null,
  district: 'Nashik',
  state: 'Maharashtra',
  section: 'ordered',
  enteredAt: '2026-03-01T06:30:00.000Z',
  previousHolders: [
    {
      holder: 'Rahul Verma',
      from: '2025-12-01T06:30:00.000Z',
      to: '2026-03-01T06:30:00.000Z',
      reason: null,
      systemMarked: true,
    },
    {
      holder: 'Priya Singh',
      from: '2025-06-01T06:30:00.000Z',
      to: '2025-11-30T06:30:00.000Z',
      reason: 'rate_too_high',
      systemMarked: false,
    },
  ],
  ...over,
});

function pool(over: Partial<holding.PoolPage> = {}): holding.PoolPage {
  return {
    counts: { ordered: 1, new: 0 },
    items: [card()],
    total: 1,
    claim: { allowed: true, reason: null },
    ...over,
  };
}

describe('LOCK-34 — the Pool tab', () => {
  it('shows the firm, the place and the holders’ history — and says why Claim is off', async () => {
    vi.mocked(holding.getPool).mockResolvedValue(
      pool({ claim: { allowed: false, reason: 'You have 50 uncalled. Call them first.' } }),
    );
    render(<PoolTab status={CALLER} />);
    expect(await screen.findByText('Far Away Agro')).toBeInTheDocument();
    // No tehsil: the district and state stand in; the placeholder never appears.
    expect(screen.getByText('Nashik, Maharashtra')).toBeInTheDocument();
    expect(screen.queryByText(/zzzzz/i)).toBeNull();
    expect(screen.getByText(/Rahul Verma · 01\/12\/2025 – 01\/03\/2026/)).toBeInTheDocument();
    expect(screen.getByText('owner did not diagnose')).toBeInTheDocument();
    expect(screen.getByText(/Priya Singh .* Rate too high/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled();
    expect(screen.getByText('You have 50 uncalled. Call them first.')).toBeInTheDocument();
  });

  it('claims with an Idempotency-Key and reloads the Pool', async () => {
    vi.mocked(holding.getPool).mockResolvedValue(pool());
    vi.mocked(holding.claimParty).mockResolvedValue({ holdingId: 'h1' });
    render(<PoolTab status={CALLER} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Claim' }));
    await waitFor(() => expect(holding.claimParty).toHaveBeenCalled());
    const [, partyId, key] = vi.mocked(holding.claimParty).mock.calls[0]!;
    expect(partyId).toBe('b1');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(8);
    await waitFor(() => expect(vi.mocked(holding.getPool).mock.calls.length).toBeGreaterThan(1));
  });

  it('a Team Leader gets no Claim button', async () => {
    vi.mocked(holding.getPool).mockResolvedValue(pool());
    render(
      <PoolTab status={{ enabled: true, isCaller: false, isTeamLeader: false, uncalledCap: 50 }} />,
    );
    await screen.findByText('Far Away Agro');
    expect(screen.queryByRole('button', { name: 'Claim' })).toBeNull();
  });
});

describe('LOCK-34 — Today → Clocks', () => {
  it('shows nothing while the policy is off', async () => {
    vi.mocked(holding.getHoldingStatus).mockResolvedValue({ ...CALLER, enabled: false });
    const { container } = render(
      <MemoryRouter>
        <ClocksGroup />
      </MemoryRouter>,
    );
    await waitFor(() => expect(holding.getHoldingStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(holding.getMyHoldings).not.toHaveBeenCalled();
  });

  it('shows the counter, "Overdue by …" (never a negative) and the inline reason picker', async () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
    const base = {
      via: 'intake',
      startedAt: hoursAgo(10),
      clockEndsAt: null,
      windowOpenedAt: null,
      releasesAt: null,
      reason: null,
      backlog: false,
      tehsil: null,
      district: null,
      state: null,
    };
    vi.mocked(holding.getMyHoldings).mockResolvedValue({
      uncalled: 1,
      cap: 50,
      items: [
        {
          ...base,
          holdingId: 'h1',
          buyerId: 'b1',
          firm: 'Late Lead Traders',
          kind: 'lead',
          uncalled: true,
          callDueAt: new Date(Date.now() - (2 * 60 + 10) * 60_000).toISOString(),
        },
        {
          ...base,
          holdingId: 'h2',
          buyerId: 'b2',
          firm: 'Lapsing Agro',
          kind: 'book',
          uncalled: false,
          callDueAt: null,
          windowOpenedAt: hoursAgo(72),
          releasesAt: new Date(Date.now() + 4 * 24 * 3600_000 - 3600_000).toISOString(),
        },
      ],
    });
    render(
      <MemoryRouter>
        <ClocksGroup />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Uncalled 1 / 50')).toBeInTheDocument();
    expect(screen.getByText('Late Lead Traders')).toBeInTheDocument();
    expect(screen.getByText(/Overdue by 2h 1\dm/)).toBeInTheDocument();
    expect(screen.getByText('Releasing in 4 days')).toBeInTheDocument();
    expect(screen.queryByText(/-\d/)).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Reason' })).toBeInTheDocument();
  });
});

describe('LOCK-34 — Manage → Dormant policy', () => {
  const settings: holding.PolicySettings = {
    enabled: false,
    goLiveDate: null,
    orderedDays: 90,
    billingThresholdPaise: 1_000_000,
    reasonWindowDays: 7,
    uncalledCap: 50,
    firstCallWorkingHours: 4,
    leadDays: 60,
    unclaimedDays: 3,
    backlogPerWeek: 100,
    seasons: [{ name: 'Kharif', fromMonth: 6, toMonth: 9 }],
  };

  it('shows the billing amount in rupees, saves it in paise with an Idempotency-Key, and refuses a bad number in words', async () => {
    vi.mocked(holding.getPolicy).mockResolvedValue({ settings, nightlyJobEnabled: false });
    vi.mocked(holding.updatePolicy).mockResolvedValue({ settings, nightlyJobEnabled: false });
    render(<DormantPolicyPage />);
    const amount = await screen.findByLabelText(/Billing that restarts/);
    expect(amount).toHaveValue('10000');
    expect(screen.getByText('= ₹10,000.00')).toBeInTheDocument();
    expect(screen.getByText('not running')).toBeInTheDocument();

    await userEvent.clear(amount);
    await userEvent.type(amount, '15000');
    const days = screen.getByLabelText(/Days the holder has to say why/);
    await userEvent.clear(days);
    await userEvent.type(days, 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(/Enter days the holder has to say why as a whole number/),
    ).toBeInTheDocument();
    expect(holding.updatePolicy).not.toHaveBeenCalled();

    await userEvent.clear(days);
    await userEvent.type(days, '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(holding.updatePolicy).toHaveBeenCalled());
    const [, patch, key] = vi.mocked(holding.updatePolicy).mock.calls[0]!;
    expect(patch).toMatchObject({ billingThresholdPaise: 1_500_000, reasonWindowDays: 10 });
    expect(typeof key).toBe('string');
  });

  it('will not switch the policy on without a go-live date', async () => {
    vi.mocked(holding.getPolicy).mockResolvedValue({ settings, nightlyJobEnabled: false });
    render(<DormantPolicyPage />);
    await userEvent.click(await screen.findByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Set the go-live date before switching this on.'),
    ).toBeInTheDocument();
    expect(holding.updatePolicy).not.toHaveBeenCalled();
  });
});

describe('LOCK-34 — wording helpers', () => {
  const now = new Date('2026-11-09T08:00:00Z').getTime(); // 13:30 IST

  it('call-by time reads in IST and never goes negative', () => {
    expect(callDueText('2026-11-09T07:30:00Z', now)).toEqual({
      text: 'Overdue by 30m',
      overdue: true,
    });
    expect(callDueText('2026-11-09T05:20:00Z', now).text).toBe('Overdue by 2h 40m');
    expect(callDueText('2026-11-09T10:00:00Z', now)).toEqual({
      text: 'Call by 15:30',
      overdue: false,
    });
    expect(callDueText('2026-11-10T07:30:00Z', now).text).toBe('Call by 10/11 13:00');
  });

  it('releasing and clock text never show a negative number', () => {
    expect(releasingText('2026-11-13T08:00:00Z', now)).toBe('Releasing in 4 days');
    expect(releasingText('2026-11-01T08:00:00Z', now)).toBe('Releasing today');
    expect(clockText('2026-11-01T08:00:00Z', false, now)).toBe('Window opens today');
    expect(clockText('2026-11-20T08:00:00Z', false, now)).toBe('11 days left');
    expect(clockText('2026-11-01T08:00:00Z', true, now)).toBe('In the backlog queue');
  });

  it('a party with no tehsil shows district and state; a placeholder mobile is "No mobile"', () => {
    expect(placeText({ tehsil: 'Mhow', district: 'Indore', state: 'MP' })).toBe('Mhow, Indore');
    expect(placeText({ tehsil: null, district: 'Nashik', state: 'Maharashtra' })).toBe(
      'Nashik, Maharashtra',
    );
    expect(isPlaceholderMobile('9999999991')).toBe(true);
    expect(isPlaceholderMobile('+91 99999 99995')).toBe(true);
    expect(isPlaceholderMobile('9876543210')).toBe(false);
  });
});
