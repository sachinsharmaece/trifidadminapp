import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getAssignableSalesPeople } from '../src/api/sales';
import { changeOwner, lookupLead } from '../src/api/leads';
import { ApiError } from '../src/api/errors';
import { LeadLookup } from '../src/components/lead/LeadLookup';
import { ChangeOwnerButton } from '../src/components/lead/ChangeOwner';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/sales', () => ({ getAssignableSalesPeople: vi.fn() }));
vi.mock('../src/api/purchase', () => ({ getAssignablePurchasePeople: vi.fn() }));
vi.mock('../src/api/leads', () => ({ lookupLead: vi.fn(), changeOwner: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => false,
    status: 'authenticated',
    me: null,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
  vi.mocked(getAssignableSalesPeople).mockResolvedValue([
    { employeeId: 'e1', person: 'Arun Exec', isSelf: false },
    { employeeId: 'e2', person: 'Bina Exec', isSelf: false },
  ]);
  vi.mocked(lookupLead).mockReset();
  vi.mocked(changeOwner).mockReset();
});

function renderLookup() {
  render(
    <MemoryRouter>
      <LeadLookup side="buyer" fileHref={(id) => `/sales/buyers/${id}`} />
    </MemoryRouter>,
  );
}

describe('Phase 5 — exact lookup', () => {
  it('shows the firm and its leader for a buyer owned elsewhere, with no way into the file', async () => {
    vi.mocked(lookupLead).mockResolvedValue([
      {
        firm: 'Chetan Drug House',
        side: 'buyer',
        leader: 'Mohan Leader',
        inQueue: false,
        profileId: null,
      },
    ]);
    renderLookup();
    fireEvent.change(screen.getByLabelText(/^Exact GSTIN/), {
      target: { value: '23abcde1234f1z5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Look up/ }));
    expect(await screen.findByText('Chetan Drug House')).toBeTruthy();
    expect(screen.getByText(/leader Mohan Leader/)).toBeTruthy();
    expect(screen.getByText(/Ask Mohan Leader if you need him/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Open' })).toBeNull();
    expect(lookupLead).toHaveBeenCalledWith('token', 'gstin', '23ABCDE1234F1Z5');
  });

  it('links to the file when he is in the caller’s own scope', async () => {
    vi.mocked(lookupLead).mockResolvedValue([
      {
        firm: 'Arun Medicals',
        side: 'buyer',
        leader: 'Leela Leader',
        inQueue: false,
        profileId: 'b1',
      },
    ]);
    renderLookup();
    fireEvent.change(screen.getByLabelText(/^Exact GSTIN/), {
      target: { value: '23ABCDE1234F1Z5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Look up/ }));
    const open = await screen.findByRole('link', { name: 'Open' });
    expect(open.getAttribute('href')).toBe('/sales/buyers/b1');
  });

  it('says the server’s refusal (rate limit) in place', async () => {
    vi.mocked(lookupLead).mockRejectedValue(
      new ApiError({
        code: 'RATE_LIMITED',
        message: 'That is 60 look-ups this hour — try again later.',
      }),
    );
    renderLookup();
    fireEvent.change(screen.getByLabelText(/^Exact GSTIN/), {
      target: { value: '23ABCDE1234F1Z5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Look up/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/60 look-ups/);
  });
});

describe('Phase 5 — Change owner', () => {
  it('moves him to someone in the team, with an Idempotency-Key and the note', async () => {
    vi.mocked(changeOwner).mockResolvedValue({ ownerEmployeeId: 'e2', owner: 'Bina Exec' });
    const onChanged = vi.fn();
    render(
      <ChangeOwnerButton
        side="buyer"
        profileId="b1"
        firm="Arun Medicals"
        current={{ employeeId: 'e1', person: 'Arun Exec' }}
        onChanged={onChanged}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Change owner/ }));
    await screen.findByRole('option', { name: 'Bina Exec' });
    const submit = screen.getAllByRole('button', { name: /Change owner/ }).at(-1)!;
    expect((submit as HTMLButtonElement).disabled).toBe(true); // nothing changed yet
    fireEvent.change(screen.getByLabelText(/Assigned to/), { target: { value: 'e2' } });
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: 'Market moved' } });
    fireEvent.click(submit);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const [, side, profileId, input, key] = vi.mocked(changeOwner).mock.calls[0]!;
    expect([side, profileId, input]).toEqual([
      'buyer',
      'b1',
      { ownerEmployeeId: 'e2', note: 'Market moved' },
    ]);
    expect(key).toBeTruthy();
  });

  it('"Queue" sends null', async () => {
    vi.mocked(changeOwner).mockResolvedValue({ ownerEmployeeId: null, owner: null });
    render(
      <ChangeOwnerButton
        side="buyer"
        profileId="b1"
        firm="Arun Medicals"
        current={{ employeeId: 'e1', person: 'Arun Exec' }}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Change owner/ }));
    await screen.findByRole('option', { name: 'Bina Exec' });
    fireEvent.change(screen.getByLabelText(/Assigned to/), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Change owner/ }).at(-1)!);
    await waitFor(() => expect(changeOwner).toHaveBeenCalled());
    expect(vi.mocked(changeOwner).mock.calls[0]![3]).toEqual({
      ownerEmployeeId: null,
      note: undefined,
    });
  });

  it('shows the server’s refusal, e.g. someone outside his team', async () => {
    vi.mocked(changeOwner).mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'Chetan Exec is not in your team.',
        field: 'ownerEmployeeId',
      }),
    );
    render(
      <ChangeOwnerButton
        side="buyer"
        profileId="b1"
        firm="Arun Medicals"
        current={{ employeeId: 'e1', person: 'Arun Exec' }}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Change owner/ }));
    await screen.findByRole('option', { name: 'Bina Exec' });
    fireEvent.change(screen.getByLabelText(/Assigned to/), { target: { value: 'e2' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Change owner/ }).at(-1)!);
    expect(await screen.findByText('Chetan Exec is not in your team.')).toBeTruthy();
  });
});
