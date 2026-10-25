import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TeamPage } from '../src/desks/admin/TeamPage';
import { useAuth } from '../src/auth/AuthContext';
import {
  createEmployee,
  getEmployee,
  getEmployees,
  getLaneBoard,
  revealEmployeePii,
  updateEmployee,
} from '../src/api/admin';
import { ApiError } from '../src/api/errors';
import type { EmployeeDetail, EmployeeListItem } from '../src/api/dto';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/admin', () => ({
  getEmployees: vi.fn(),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  getLaneBoard: vi.fn(),
  createAbsence: vi.fn(),
  getDeactivationImpact: vi.fn(),
  deactivateEmployee: vi.fn(),
  reactivateEmployee: vi.fn(),
  revealEmployeePii: vi.fn(),
}));

function mockAuth(permissions: string[] = ['employee:write']) {
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

const LEADER: EmployeeListItem = {
  employeeId: 'p1',
  person: 'Purchase Head',
  email: 'p@x.in',
  mobile: '9000000001',
  roleKeys: ['purchase'],
  positions: ['PURCHASE_LEADER'],
  reportsToSalesLeader: null,
  reportsToPurchaseLeader: null,
  worksForTeams: [],
  worksForAllTeams: false,
  laneKeys: [],
  active: true,
  mfaEnabled: false,
  hrComplete: true,
};

beforeEach(() => {
  vi.mocked(getEmployees).mockResolvedValue([LEADER]);
  vi.mocked(getLaneBoard).mockResolvedValue([
    { laneKey: 'B1', funnel: 'purchase_trade', label: 'Demand raised', isCovered: false },
  ]);
});

function createCard() {
  const heading = screen.getByRole('heading', { name: 'Create employee' });
  return within(heading.closest('section') as HTMLElement);
}

function fillValid(card: ReturnType<typeof within>) {
  fireEvent.change(card.getByLabelText(/^Name/), { target: { value: 'Test Person' } });
  fireEvent.change(card.getByLabelText(/^Email/), { target: { value: 'test@trifid.example' } });
  fireEvent.change(card.getByLabelText(/^Mobile/), { target: { value: '98765 43210' } });
  fireEvent.change(card.getByLabelText(/^Password/), { target: { value: 'CorrectHorse123' } });
  fireEvent.change(card.getByLabelText(/^Date of birth/), { target: { value: '1990-05-01' } });
  fireEvent.change(card.getByLabelText(/^PAN/), { target: { value: 'abcpe1234f' } });
  fireEvent.change(card.getByLabelText(/^Aadhaar/), { target: { value: '2341 2341 2346' } });
  fireEvent.change(card.getByLabelText(/^Father's name/), { target: { value: 'Ramesh' } });
  fireEvent.change(card.getByLabelText(/^Emergency contact name/), { target: { value: 'Sita' } });
  fireEvent.change(card.getByLabelText(/^Relation/), { target: { value: 'Mother' } });
  fireEvent.change(card.getByLabelText(/^Emergency contact mobile/), {
    target: { value: '9876543211' },
  });
  fireEvent.change(card.getByLabelText(/^Permanent address/), {
    target: { value: '12 MG Road, Indore' },
  });
  fireEvent.click(card.getByLabelText(/same as permanent/i));
}

describe('TeamPage (Phase 2)', () => {
  it("surfaces the server's lane-board rejection (BR-262), and sends an Idempotency-Key", async () => {
    mockAuth();
    vi.mocked(createEmployee).mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'This employee cannot be saved: the lane board still has unheld lanes: B1.',
        field: 'laneKeys',
      }),
    );
    render(<TeamPage />);
    await screen.findByRole('heading', { name: 'Create employee' });
    await screen.findAllByText('Purchase Head');
    const card = createCard();
    fillValid(card);
    fireEvent.click(card.getByLabelText(/^Accounts/));
    fireEvent.click(card.getByRole('button', { name: /create employee/i }));

    expect(await screen.findByText(/still has unheld lanes: B1/i)).toBeInTheDocument();
    const [, input, key] = vi.mocked(createEmployee).mock.calls[0]!;
    expect(input).toMatchObject({
      mobile: '9876543210',
      roleKeys: ['accounts'],
      hr: { pan: 'ABCPE1234F', aadhaar: '234123412346', currentSameAsPermanent: true },
    });
    expect(key).toEqual(expect.any(String));
  });

  it('ticking Sales Leader ticks and locks Purchase Executive, who reports to Admin (DEC-066)', async () => {
    mockAuth();
    render(<TeamPage />);
    await screen.findByRole('heading', { name: 'Create employee' });
    await screen.findAllByText('Purchase Head');
    const card = createCard();
    fireEvent.click(card.getByLabelText(/^Sales Leader/));
    const purchaseExec = card.getByLabelText(/^Purchase Executive/) as HTMLInputElement;
    expect(purchaseExec.checked).toBe(true);
    expect(purchaseExec.disabled).toBe(true);
    expect(card.queryByLabelText(/Reports to \(Purchase Leader\)/)).not.toBeInTheDocument();
    expect(card.getByText(/a\s+Sales Leader reports to Admin/)).toBeInTheDocument();
    // A plain Purchase Executive still picks his Purchase Leader.
    // (Unticking Sales Leader leaves Purchase Executive ticked, now unlocked.)
    fireEvent.click(card.getByLabelText(/^Sales Leader/));
    expect(card.getByLabelText(/Reports to \(Purchase Leader\)/)).toBeInTheDocument();
    fireEvent.click(card.getByLabelText(/^Sales Leader/));
    // Its role is ticked from the position.
    expect(
      (card.getByLabelText(/^Sales\s*\(from the position\)/) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (card.getByLabelText(/^Purchase\s*\(from the position\)/) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('shows each problem next to its field before sending anything', async () => {
    mockAuth();
    render(<TeamPage />);
    await screen.findByRole('heading', { name: 'Create employee' });
    await screen.findAllByText('Purchase Head');
    const card = createCard();
    fillValid(card);
    fireEvent.change(card.getByLabelText(/^Mobile/), { target: { value: '12345' } });
    fireEvent.change(card.getByLabelText(/^PAN/), { target: { value: 'AAPFU0939F' } });
    fireEvent.change(card.getByLabelText(/^Aadhaar/), { target: { value: '234123412345' } });
    fireEvent.change(card.getByLabelText(/^Date of birth/), { target: { value: '2015-01-01' } });
    fireEvent.click(card.getByLabelText(/^Sales Executive/));
    fireEvent.click(card.getByRole('button', { name: /create employee/i }));

    expect(card.getByText(/10-digit number starting 6–9/)).toBeInTheDocument();
    expect(card.getByText(/P as its 4th letter/)).toBeInTheDocument();
    expect(card.getByText(/Aadhaar number does not check out/)).toBeInTheDocument();
    expect(card.getByText(/at least 18 years old/)).toBeInTheDocument();
    expect(card.getByText(/Pick the Sales Leader this person reports to/)).toBeInTheDocument();
    expect(createEmployee).not.toHaveBeenCalled();
  });

  it('Edit shows PAN/Aadhaar masked, keeps them when blank, and only Admin gets "Show"', async () => {
    const detail: EmployeeDetail = {
      ...LEADER,
      hr: {
        dob: '1990-05-01',
        panMasked: 'XXXXXX234F',
        aadhaarMasked: 'XXXX XXXX 2346',
        fatherName: 'Ramesh',
        fatherMobile: null,
        husbandName: null,
        husbandMobile: null,
        emergencyContact: { name: 'Sita', relation: 'Mother', mobile: '9876543211' },
        permanentAddress: '12 MG Road, Indore',
        currentAddress: '12 MG Road, Indore',
        currentSameAsPermanent: true,
        education: { level: null, other: null },
      },
    };
    vi.mocked(getEmployee).mockResolvedValue(detail);
    vi.mocked(revealEmployeePii).mockResolvedValue({ field: 'pan', value: 'ABCPE1234F' });

    mockAuth(['employee:write']);
    const { unmount } = render(<TeamPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(await screen.findByPlaceholderText('XXXXXX234F')).toBeInTheDocument();
    expect(screen.getByText('Leave blank to keep the current password.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show' })).not.toBeInTheDocument();
    unmount();

    mockAuth(['employee:write', 'employee:pii_reveal']);
    render(<TeamPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Show' }))[0]!);
    await waitFor(() => expect(screen.getByPlaceholderText('ABCPE1234F')).toBeInTheDocument());
    expect(revealEmployeePii).toHaveBeenCalledWith('token', 'p1', 'pan');
  });

  it('Edit of an employee with no HR details saves without them, unless "Add HR details now" is ticked', async () => {
    const older: EmployeeDetail = { ...LEADER, hrComplete: false, hr: null };
    vi.mocked(getEmployee).mockResolvedValue(older);
    vi.mocked(updateEmployee).mockResolvedValue({ employeeId: 'p1' });
    mockAuth(['employee:write']);
    render(<TeamPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(await screen.findByText(/No HR details on record/)).toBeInTheDocument();
    // Only the Create form on the page asks for a date of birth.
    expect(screen.getAllByLabelText(/^Date of birth/)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateEmployee).toHaveBeenCalled());
    const [, , input] = vi.mocked(updateEmployee).mock.calls[0]!;
    expect(input).not.toHaveProperty('hr');

    // Ticked, the HR fields are back and checked before sending.
    vi.mocked(updateEmployee).mockClear();
    fireEvent.click(screen.getByLabelText(/Add HR details now/));
    expect(screen.getAllByLabelText(/^Date of birth/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('Enter the PAN.')).toBeInTheDocument();
    expect(updateEmployee).not.toHaveBeenCalled();
  });
});
