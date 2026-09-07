import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamPage } from '../src/desks/admin/TeamPage';
import { useAuth } from '../src/auth/AuthContext';
import { getEmployees, createEmployee, getLaneBoard } from '../src/api/admin';
import { ApiError } from '../src/api/errors';

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../src/api/admin', () => ({
  getEmployees: vi.fn(),
  createEmployee: vi.fn(),
  getLaneBoard: vi.fn(),
  createAbsence: vi.fn(),
}));

function mockAuth() {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: vi.fn(),
    status: 'authenticated',
    me: null,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
  });
}

describe('TeamPage (BR-262 — the lane board rejection is shown, not hidden)', () => {
  it("surfaces the server's lane-board rejection message verbatim", async () => {
    mockAuth();
    vi.mocked(getEmployees).mockResolvedValue([]);
    vi.mocked(getLaneBoard).mockResolvedValue([
      { laneKey: 'B1', funnel: 'purchase_trade', label: 'Demand raised', isCovered: false },
    ]);
    vi.mocked(createEmployee).mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'This employee cannot be saved: the lane board still has unheld lanes: B1.',
      }),
    );

    render(<TeamPage />);

    // "B1" legitimately appears twice — once in the read-only lane table,
    // once in the create-employee form's lane checkboxes — so this uses
    // getAllByText rather than the ambiguous singular form.
    await waitFor(() => expect(screen.getAllByText(/B1/).length).toBeGreaterThan(0), {
      timeout: 3000,
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test Person' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@trifid.example' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'CorrectHorse123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /purchase/i }));
    fireEvent.click(screen.getByRole('button', { name: /create employee/i }));

    expect(await screen.findByText(/still has unheld lanes: B1/i)).toBeInTheDocument();
  });
});
