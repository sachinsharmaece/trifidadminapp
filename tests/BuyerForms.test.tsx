import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getAssignableSalesPeople } from '../src/api/sales';
import { getMastersManufacturers } from '../src/api/purchase';
import { getDistricts, getStates, getTehsils, lookupPincode } from '../src/api/territory';
import { staffRegisterBuyer } from '../src/api/onboarding';
import { ApiError } from '../src/api/errors';
import { SalesRegisterBuyerPage } from '../src/desks/sales/SalesRegisterBuyerPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/sales', () => ({ getAssignableSalesPeople: vi.fn() }));
vi.mock('../src/api/purchase', () => ({ getMastersManufacturers: vi.fn() }));
vi.mock('../src/api/territory', () => ({
  getStates: vi.fn(),
  getDistricts: vi.fn(),
  getTehsils: vi.fn(),
  lookupPincode: vi.fn(),
  createState: vi.fn(),
  createDistrict: vi.fn(),
  createTehsil: vi.fn(),
}));
vi.mock('../src/api/onboarding', () => ({ staffRegisterBuyer: vi.fn() }));

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
    { employeeId: 'e1', person: 'Exec A', isSelf: true },
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

function renderPage() {
  render(
    <MemoryRouter>
      <SalesRegisterBuyerPage />
    </MemoryRouter>,
  );
}

async function fillValid() {
  fireEvent.change(screen.getByLabelText(/^Mobile/), { target: { value: '9876543210' } });
  fireEvent.change(screen.getByLabelText(/^Firm name/), { target: { value: 'Sharma Agro' } });
  fireEvent.change(screen.getByLabelText(/^Category/), { target: { value: 'Retailer' } });
  fireEvent.change(screen.getByLabelText(/^Address/), {
    target: { value: '12 Main Road, Mahidpur' },
  });
  fireEvent.change(screen.getByLabelText(/^Pincode/), { target: { value: '456443' } });
  await waitFor(() => expect(screen.getByLabelText(/^Tehsil/)).toHaveValue('Mahidpur'));
  fireEvent.click(screen.getByLabelText(/proprietor agreed/));
}

describe('Register a buyer (Phase 3)', () => {
  it('a GSTIN fills PAN from characters 3–12 and locks it', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^GSTIN/), { target: { value: '23aapfu0939f1z3' } });
    const pan = screen.getByLabelText(/^PAN/) as HTMLInputElement;
    expect(pan.value).toBe('AAPFU0939F');
    expect(pan.disabled).toBe(true);
  });

  it('with neither GSTIN nor PAN, still sends (DEC-068)', async () => {
    vi.mocked(staffRegisterBuyer).mockResolvedValueOnce({
      registrationId: 'r1',
      accountNameWarning: null,
      loginMobile: true,
    });
    renderPage();
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Register buyer' }));
    await waitFor(() => expect(staffRegisterBuyer).toHaveBeenCalled());
  });

  it('a shared-mobile warning asks for a tick, and the same save goes through with it', async () => {
    vi.mocked(staffRegisterBuyer)
      .mockRejectedValueOnce(
        new ApiError({
          code: 'CONFIRMATION_REQUIRED',
          message: 'Mobile Owner already uses this mobile.',
          field: 'mobile',
          meta: {
            warnings: [
              {
                key: 'sharedMobile',
                field: 'mobile',
                message:
                  'Mobile Owner already uses this mobile. Tick to confirm the same person runs both firms.',
                existingFirm: 'Mobile Owner',
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce({
        registrationId: 'r1',
        accountNameWarning: null,
        loginMobile: false,
      });
    renderPage();
    await fillValid();
    fireEvent.change(screen.getByLabelText(/^PAN/), { target: { value: 'abcfp1234k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register buyer' }));

    const tick = await screen.findByLabelText(/Tick to confirm the same person runs both firms/);
    fireEvent.click(tick);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and register' }));

    expect(await screen.findByText(/Buyer registered/)).toBeInTheDocument();
    expect(screen.getByText(/has no app login of its own/)).toBeInTheDocument();
    const [, first, firstKey] = vi.mocked(staffRegisterBuyer).mock.calls[0]!;
    const [, second, secondKey] = vi.mocked(staffRegisterBuyer).mock.calls[1]!;
    expect(first).toMatchObject({
      pan: 'ABCFP1234K',
      category: 'Retailer',
      location: { tehsilId: 't1', pincode: '456443', stateId: 's1' },
      assignedToEmployeeId: 'e1',
      proprietorAgreed: true,
    });
    expect(second.confirmations).toEqual({ sharedMobile: true });
    // The server answered the first try, so the second is a new attempt with a new key.
    expect(secondKey).not.toBe(firstKey);
    // The form resets after a save.
    expect(screen.getByLabelText(/^Firm name/)).toHaveValue('');
  });
});
