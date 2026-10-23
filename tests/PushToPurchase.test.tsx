import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getPush, getPushStatus, pushToPurchase, type PushDetailDto } from '../src/api/push';
import { listNotices } from '../src/api/notices';
import { PushToPurchaseCard } from '../src/components/push/PushToPurchaseCard';
import { FromSalesDetailPage } from '../src/desks/purchase/FromSalesDetailPage';
import { NoticeBell } from '../src/components/NoticeBell';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/push', () => ({
  getPushStatus: vi.fn(),
  pushToPurchase: vi.fn(),
  getPush: vi.fn(),
  completePush: vi.fn(),
  approvePush: vi.fn(),
  rejectPush: vi.fn(),
}));
vi.mock('../src/api/notices', () => ({
  listNotices: vi.fn(),
  markNoticeRead: vi.fn(),
  markAllNoticesRead: vi.fn(),
}));
vi.mock('../src/api/purchase', () => ({
  getAssignablePurchasePeople: vi.fn().mockResolvedValue([]),
  getMastersManufacturers: vi.fn().mockResolvedValue([]),
}));
vi.mock('../src/api/sales', () => ({ getAssignableSalesPeople: vi.fn().mockResolvedValue([]) }));
vi.mock('../src/api/territory', () => ({
  getStates: vi.fn().mockResolvedValue([]),
  getDistricts: vi.fn().mockResolvedValue([]),
  getTehsils: vi.fn().mockResolvedValue([]),
  lookupPincode: vi.fn(),
  createState: vi.fn(),
  createDistrict: vi.fn(),
  createTehsil: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => false,
    status: 'authenticated',
    me: { actorType: 'staff' } as never,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
  vi.mocked(pushToPurchase).mockReset();
});

const status = {
  canPush: true,
  blockedReason: null,
  alreadySeller: null,
  openPush: null,
  receiver: { employeeId: 'l1', person: 'Leela Leader' },
  canChooseReceiver: false,
};

describe('Phase 6 — Push to Purchase on the buyer file', () => {
  it('says where it goes, asks only for the note, and sends it with an Idempotency-Key', async () => {
    vi.mocked(getPushStatus).mockResolvedValue(status);
    vi.mocked(pushToPurchase).mockResolvedValue({
      pushId: 'p1',
      receiver: { employeeId: 'l1', person: 'Leela Leader' },
    });
    render(
      <MemoryRouter>
        <PushToPurchaseCard buyerId="b1" firm="Arun Agro" />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Push to Purchase/ }));
    expect(screen.getByText('Leela Leader')).toBeTruthy();
    expect(screen.queryByLabelText(/Goes to/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/What can he supply/), {
      target: { value: 'Two companies' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Push to Purchase/ }).at(-1)!);
    await waitFor(() => expect(pushToPurchase).toHaveBeenCalled());
    const [, buyerId, input, key] = vi.mocked(pushToPurchase).mock.calls[0]!;
    expect([buyerId, input]).toEqual(['b1', { note: 'Two companies' }]);
    expect(key).toBeTruthy();
  });

  it('is off with a link when he is already a seller', async () => {
    vi.mocked(getPushStatus).mockResolvedValue({
      ...status,
      canPush: false,
      blockedReason: 'Already a seller.',
      alreadySeller: { sellerId: 's9', firm: 'Arun Agro' },
    });
    render(
      <MemoryRouter>
        <PushToPurchaseCard buyerId="b1" firm="Arun Agro" />
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: 'Arun Agro' });
    expect(link.getAttribute('href')).toBe('/purchase/sellers/s9');
    expect(
      (screen.getByRole('button', { name: /Push to Purchase/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

const detail: PushDetailDto = {
  pushId: 'p1',
  status: 'submitted',
  firm: 'Pan Only Agro',
  ownerName: 'Owner',
  contactMobile: '9876543210',
  gstin: null,
  pan: 'ABCDE1234F',
  licenceNo: 'MP/IND/1',
  location: {
    address: '1 Road',
    pincode: null,
    stateId: null,
    districtId: null,
    tehsilId: null,
    tehsil: null,
    district: null,
    state: null,
  },
  pushedBy: 'Arun Exec',
  pushedAt: '2026-10-23T10:00:00.000Z',
  note: 'Seeds',
  receiver: { employeeId: 'l1', person: 'Leela Leader' },
  draft: null,
  firmHasBankDetail: false,
  needsGstin: true,
  canComplete: false,
  canDecide: true,
  rejectionReason: null,
  sellerId: null,
};

describe('Phase 6 — From Sales, one push', () => {
  it('shows "Pushed by" and the note, and holds approval while he has only a PAN', async () => {
    vi.mocked(getPush).mockResolvedValue(detail);
    render(
      <MemoryRouter initialEntries={['/purchase/from-sales/p1']}>
        <Routes>
          <Route path="/purchase/from-sales/:pushId" element={<FromSalesDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Arun Exec/)).toBeTruthy();
    expect(screen.getByText('Seeds')).toBeTruthy();
    expect(screen.getByText(/cannot be approved as a\s+seller without one/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: /Approve as seller/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe('Phase 6 — the bell', () => {
  it('shows the unread count and the notices', async () => {
    vi.mocked(listNotices).mockResolvedValue({
      unread: 2,
      items: [
        {
          noticeId: 'n1',
          kind: 'push_approved',
          title: 'Arun Agro is now a seller',
          body: 'Purchase approved the buyer you pushed.',
          link: '/sales/pushed',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    render(
      <MemoryRouter>
        <NoticeBell />
      </MemoryRouter>,
    );
    const bell = await screen.findByRole('button', { name: 'Notices, 2 unread' });
    fireEvent.click(bell);
    expect(screen.getByText('Arun Agro is now a seller')).toBeTruthy();
  });
});
