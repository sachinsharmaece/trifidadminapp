import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../src/auth/LoginPage';
import { ApiError } from '../src/api/errors';
import { useAuth } from '../src/auth/AuthContext';

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  it("shows API_CONTRACT.md's INVALID_CREDENTIALS error in plain English", async () => {
    const login = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' }),
      );
    vi.mocked(useAuth).mockReturnValue({
      login,
      verifyMfa: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn(),
      callApi: vi.fn(),
      status: 'anonymous',
      me: null,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'staff@trifid.example' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(login).toHaveBeenCalledWith('staff@trifid.example', 'wrong-password');
  });

  it('moves to the MFA step when the server asks for one', async () => {
    const login = vi.fn().mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa-token' });
    vi.mocked(useAuth).mockReturnValue({
      login,
      verifyMfa: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn(),
      callApi: vi.fn(),
      status: 'anonymous',
      me: null,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@trifid.example' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'CorrectHorse123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument();
    });
  });
});
