import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { getDistricts, getStates, getTehsils } from '../src/api/territory';
import { TehsilsPage } from '../src/desks/admin/TehsilsPage';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/components/ui/Toast', () => ({
  useToast: () => ({ show: vi.fn() }),
  useOptionalToast: () => null,
}));
vi.mock('../src/api/territory', () => ({
  getStates: vi.fn(),
  getDistricts: vi.fn(),
  getTehsils: vi.fn(),
  createState: vi.fn(),
  createDistrict: vi.fn(),
  createTehsil: vi.fn(),
  updateTehsil: vi.fn(),
}));

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

function mockData() {
  vi.mocked(getStates).mockResolvedValue([]);
  vi.mocked(getDistricts).mockResolvedValue([]);
  vi.mocked(getTehsils).mockResolvedValue([
    {
      tehsilId: 't1',
      name: 'Mahidpur',
      district: 'Ujjain',
      state: 'Madhya Pradesh',
      districtId: 'd1',
      stateId: 's1',
    },
    {
      tehsilId: 't2',
      name: 'Patera',
      district: 'damoh',
      state: 'MP',
      districtId: null,
      stateId: null,
    },
  ]);
}

describe('Manage › Tehsils (Phase 1)', () => {
  it('shows district and state, and marks a tehsil the migration has not linked', async () => {
    mockAuth([]);
    mockData();
    render(<TehsilsPage />);
    expect(await screen.findByText('Mahidpur')).toBeInTheDocument();
    expect(screen.getByText('Not linked')).toBeInTheDocument();
  });

  it('an executive reads only; Admin or a leader can add and edit', async () => {
    mockAuth([]);
    mockData();
    const { unmount } = render(<TehsilsPage />);
    await screen.findByText('Mahidpur');
    expect(screen.queryByText('Add a tehsil')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    unmount();

    mockAuth(['location:master_write']);
    render(<TehsilsPage />);
    await screen.findByText('Mahidpur');
    expect(screen.getByText('Add a tehsil')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
  });
});
