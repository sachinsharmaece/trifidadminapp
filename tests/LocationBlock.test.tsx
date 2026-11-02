import { useState } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import {
  createDistrict,
  getDistricts,
  getStates,
  getTehsils,
  lookupPincode,
} from '../src/api/territory';
import {
  EMPTY_LOCATION,
  LocationBlock,
  type LocationValue,
} from '../src/components/location/LocationBlock';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/territory', () => ({
  getStates: vi.fn(),
  getDistricts: vi.fn(),
  getTehsils: vi.fn(),
  lookupPincode: vi.fn(),
  createState: vi.fn(),
  createDistrict: vi.fn(),
  createTehsil: vi.fn(),
}));

const MP = { stateId: 's-mp', name: 'Madhya Pradesh', gstStateCode: '23' };
const UJJAIN = {
  districtId: 'd-ujj',
  name: 'Ujjain',
  stateId: 's-mp',
  stateName: 'Madhya Pradesh',
};
const tehsil = (tehsilId: string, name: string) => ({
  tehsilId,
  name,
  district: 'Ujjain',
  state: 'Madhya Pradesh',
  districtId: 'd-ujj',
  stateId: 's-mp',
});

function mockAuth(permissions: string[]) {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: (p: string) => permissions.includes(p),
    status: 'authenticated',
    me: null,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
}

let latest: LocationValue = EMPTY_LOCATION;
function Harness() {
  const [value, setValue] = useState<LocationValue>(EMPTY_LOCATION);
  latest = value;
  return <LocationBlock value={value} onChange={setValue} required />;
}

beforeEach(() => {
  vi.mocked(getStates).mockResolvedValue([MP]);
  vi.mocked(getDistricts).mockResolvedValue([UJJAIN]);
  vi.mocked(getTehsils).mockResolvedValue([tehsil('t-mah', 'Mahidpur'), tehsil('t-tar', 'Tarana')]);
});

describe('LocationBlock (Phase 1)', () => {
  it('a known pincode fills State, District and Tehsil in, and they stay editable', async () => {
    mockAuth([]);
    vi.mocked(lookupPincode).mockResolvedValue({
      pincode: '456443',
      status: 'verified',
      tehsilId: 't-mah',
      tehsilName: 'Mahidpur',
      districtId: 'd-ujj',
      districtName: 'Ujjain',
      stateId: 's-mp',
      stateName: 'Madhya Pradesh',
    });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/Pincode/), { target: { value: '456 443' } });

    await waitFor(() =>
      expect(latest).toMatchObject({
        pincode: '456443',
        stateId: 's-mp',
        districtId: 'd-ujj',
        tehsilId: 't-mah',
      }),
    );
    expect(await screen.findByText(/Mahidpur, Ujjain, Madhya Pradesh/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Tehsil/)).toHaveValue('Mahidpur'));

    // Pick a different tehsil: the record changes, and a note says the master does not.
    fireEvent.focus(screen.getByLabelText(/Tehsil/));
    fireEvent.mouseDown(await screen.findByRole('option', { name: 'Tarana' }));
    expect(latest.tehsilId).toBe('t-tar');
    expect(await screen.findByText(/the pincode list is not changed/)).toBeInTheDocument();
  });

  it('an unknown pincode asks for the tehsil and says it will be saved for verification', async () => {
    mockAuth([]);
    vi.mocked(lookupPincode).mockResolvedValue(null);
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/Pincode/), { target: { value: '456999' } });
    expect(await screen.findByText(/New pincode — pick the tehsil below/)).toBeInTheDocument();
    expect(latest.tehsilId).toBe('');
  });

  it('a pincode starting with 0 is a field error and is never looked up', async () => {
    mockAuth([]);
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/Pincode/), { target: { value: '045200' } });
    expect(await screen.findByText('A pincode never starts with 0.')).toBeInTheDocument();
    expect(lookupPincode).not.toHaveBeenCalledWith('token', '045200');
  });

  it('an executive is told to ask his leader; Admin gets "+ Add new" and the new district is picked', async () => {
    mockAuth([]);
    const { unmount } = render(<Harness />);
    expect(await screen.findAllByText('Not in the list? Ask your leader.')).not.toHaveLength(0);
    expect(screen.queryByText(/Add new state/)).not.toBeInTheDocument();
    unmount();

    mockAuth(['location:master_write']);
    vi.mocked(createDistrict).mockResolvedValue({
      districtId: 'd-new',
      name: 'Agar Malwa',
      stateId: 's-mp',
      stateName: 'Madhya Pradesh',
    });
    render(<Harness />);
    fireEvent.focus(screen.getByLabelText(/^State/));
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Madhya Pradesh/ }));
    fireEvent.click(await screen.findByText(/Add new district/));
    fireEvent.change(screen.getByLabelText(/New district name/), {
      target: { value: 'agar malwa' },
    });
    vi.mocked(getDistricts).mockResolvedValue([
      UJJAIN,
      { districtId: 'd-new', name: 'Agar Malwa', stateId: 's-mp', stateName: 'Madhya Pradesh' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Add district' }));

    await waitFor(() => expect(latest.districtId).toBe('d-new'));
    const [, input, key] = vi.mocked(createDistrict).mock.calls[0]!;
    expect(input).toEqual({ name: 'agar malwa', stateId: 's-mp' });
    expect(key).toEqual(expect.any(String)); // sent with an Idempotency-Key
    expect(await screen.findByText('New district added and picked.')).toBeInTheDocument();
  });
});
