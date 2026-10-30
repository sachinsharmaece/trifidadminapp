import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getAssignablePurchasePeople, getMastersManufacturers } from '../src/api/purchase';
import { getDistricts, getStates, getTehsils, lookupPincode } from '../src/api/territory';
import { staffRegisterSeller } from '../src/api/onboarding';
import { AddSellerPage } from '../src/desks/purchase/AddSellerPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/sales', () => ({ getAssignableSalesPeople: vi.fn() }));
vi.mock('../src/api/purchase', () => ({
  getAssignablePurchasePeople: vi.fn(),
  getMastersManufacturers: vi.fn(),
}));
vi.mock('../src/api/territory', () => ({
  getStates: vi.fn(),
  getDistricts: vi.fn(),
  getTehsils: vi.fn(),
  lookupPincode: vi.fn(),
  createState: vi.fn(),
  createDistrict: vi.fn(),
  createTehsil: vi.fn(),
}));
vi.mock('../src/api/onboarding', () => ({ staffRegisterSeller: vi.fn() }));

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
  vi.mocked(getAssignablePurchasePeople).mockResolvedValue([
    { employeeId: 'p1', person: 'Purchase Exec', isSelf: true },
  ]);
  vi.mocked(getMastersManufacturers).mockResolvedValue([]);
  vi.mocked(getStates).mockResolvedValue([
    { stateId: 's1', name: 'Madhya Pradesh', gstStateCode: '23' },
  ]);
  vi.mocked(getDistricts).mockResolvedValue([
    { districtId: 'd1', name: 'Ujjain', stateId: 's1', stateName: 'Madhya Pradesh' },
  ]);
  vi.mocked(getTehsils).mockResolvedValue([
    {
      tehsilId: 't1',
      name: 'Mahidpur',
      district: 'Ujjain',
      state: 'Madhya Pradesh',
      districtId: 'd1',
      stateId: 's1',
    },
  ]);
  vi.mocked(lookupPincode).mockResolvedValue({
    pincode: '456443',
    status: 'verified',
    tehsilId: 't1',
    tehsilName: 'Mahidpur',
    districtId: 'd1',
    districtName: 'Ujjain',
    stateId: 's1',
    stateName: 'Madhya Pradesh',
  });
});

/** Whether the field's label carries the red required star. */
function starred(label: RegExp): boolean {
  const input = screen.getByLabelText(label);
  return document.querySelector(`label[for="${input.id}"]`)!.textContent!.includes('*');
}

describe('Add a seller (Phase 4)', () => {
  it('has no OTP text, needs the location and the proprietor tick, and sends location, assignee and a key', async () => {
    vi.mocked(staffRegisterSeller).mockResolvedValue({
      registrationId: 'r1',
      accountNameWarning: null,
    });
    render(
      <MemoryRouter>
        <AddSellerPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/OTP/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Register seller' }));
    expect(screen.getByText('Pick the tehsil from the list.')).toBeInTheDocument();
    expect(screen.getByText(/Tick that the proprietor agreed/)).toBeInTheDocument();
    expect(staffRegisterSeller).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Address/), {
      target: { value: '5 Mandi Road, Mahidpur' },
    });
    fireEvent.change(screen.getByLabelText(/^Pincode/), { target: { value: '456443' } });
    await waitFor(() => expect(screen.getByLabelText(/^Tehsil/)).toHaveValue('Mahidpur'));
    fireEvent.change(screen.getByLabelText(/^Marg party code/), { target: { value: 'sup-9' } });
    fireEvent.click(screen.getByLabelText(/proprietor agreed/));
    fireEvent.click(screen.getByRole('button', { name: 'Register seller' }));

    await waitFor(() => expect(staffRegisterSeller).toHaveBeenCalled());
    const [, input, key] = vi.mocked(staffRegisterSeller).mock.calls[0]!;
    expect(input).toMatchObject({
      location: { tehsilId: 't1', pincode: '456443', stateId: 's1', districtId: 'd1' },
      margPartyCode: 'SUP-9',
      assignedToEmployeeId: 'p1',
      proprietorAgreed: true,
    });
    expect(key).toEqual(expect.any(String));
    // DEC-069 — licence, bank detail and referees left empty are simply not sent.
    expect(input).not.toHaveProperty('licenceNo');
    expect(input).not.toHaveProperty('bankDetail');
    expect(input).not.toHaveProperty('references');
    expect(await screen.findByText(/Seller registered/)).toBeInTheDocument();
  });

  it('marks licence, bank and referees optional, and sends only the referee that was typed (DEC-069)', async () => {
    vi.mocked(staffRegisterSeller).mockResolvedValue({
      registrationId: 'r1',
      accountNameWarning: null,
    });
    render(
      <MemoryRouter>
        <AddSellerPage />
      </MemoryRouter>,
    );
    for (const label of [
      /^Insecticide licence/,
      /^Bank account number/,
      /^IFSC/,
      /^Account name/,
      /^Referee 1 — firm/,
      /^Referee 2 — phone/,
    ]) {
      expect(starred(label)).toBe(false);
    }
    expect(starred(/^Firm/)).toBe(true);

    fireEvent.change(screen.getByLabelText(/^Address/), {
      target: { value: '5 Mandi Road, Mahidpur' },
    });
    fireEvent.change(screen.getByLabelText(/^Pincode/), { target: { value: '456443' } });
    await waitFor(() => expect(screen.getByLabelText(/^Tehsil/)).toHaveValue('Mahidpur'));
    fireEvent.change(screen.getByLabelText(/^Referee 1 — firm/), { target: { value: 'Ref One' } });
    fireEvent.change(screen.getByLabelText(/^Referee 1 — phone/), {
      target: { value: '9000000001' },
    });
    fireEvent.click(screen.getByLabelText(/proprietor agreed/));
    fireEvent.click(screen.getByRole('button', { name: 'Register seller' }));

    await waitFor(() => expect(staffRegisterSeller).toHaveBeenCalled());
    const [, input] = vi.mocked(staffRegisterSeller).mock.calls[0]!;
    expect(input.references).toEqual([
      { firm: 'Ref One', phone: '9000000001', relationship: 'Supplier', whatTheySaid: 'Reliable' },
    ]);
  });
});
