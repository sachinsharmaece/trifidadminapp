import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmployeesListPage } from '../src/desks/admin/EmployeesListPage';
import { useAuth } from '../src/auth/AuthContext';
import { getEmployees } from '../src/api/admin';

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../src/api/admin', () => ({
  getEmployees: vi.fn(),
}));

function mockAuth(callApiImpl: (fn: (token: string) => unknown) => unknown) {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: vi.fn(),
    status: 'authenticated',
    me: null,
    callApi: callApiImpl as never,
  });
}

describe('EmployeesListPage (the M1/M2 live screen)', () => {
  it('renders the employee list on success', async () => {
    vi.mocked(getEmployees).mockResolvedValue([
      {
        employeeId: '1',
        person: 'Founding Admin',
        email: 'admin@trifid.example',
        roleKeys: ['admin'],
        active: true,
        mfaEnabled: true,
      },
    ]);
    mockAuth((fn) => fn('token'));

    render(<EmployeesListPage />);

    expect(await screen.findByText('Founding Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@trifid.example')).toBeInTheDocument();
  });

  it('shows the empty state when there are no employees', async () => {
    vi.mocked(getEmployees).mockResolvedValue([]);
    mockAuth((fn) => fn('token'));

    render(<EmployeesListPage />);

    expect(await screen.findByText(/no employees yet/i)).toBeInTheDocument();
  });
});
