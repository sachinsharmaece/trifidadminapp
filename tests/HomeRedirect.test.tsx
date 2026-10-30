import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { HomeRedirect, homePathFor } from '../src/auth/homePath';
import { RequireAuth } from '../src/auth/RequireAuth';
import { LoginPage } from '../src/auth/LoginPage';
import { PERMISSIONS } from '../src/lib/permissions';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

/** The permissions each seeded role carries that decide its desk (config/permissions.ts). */
const ROLE = {
  admin: Object.values(PERMISSIONS) as string[], // Admin holds every permission.
  founder: [
    PERMISSIONS.FOUNDER_OVERVIEW_READ,
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.CHAIN_READ_FULL,
  ],
  controller: [PERMISSIONS.EXCEPTION_READ, PERMISSIONS.EMPLOYEE_READ],
  accounts: [PERMISSIONS.CHAIN_READ_FULL, PERMISSIONS.MARG_KEY],
  sales: [PERMISSIONS.SALES_WORKLIST_READ, PERMISSIONS.ONBOARDING_READ],
  purchase: [PERMISSIONS.DEMAND_READ, PERMISSIONS.ONBOARDING_READ, PERMISSIONS.CATALOG_WRITE],
  salesLeaderAlsoPurchase: [PERMISSIONS.SALES_WORKLIST_READ, PERMISSIONS.DEMAND_READ],
  logistics: [PERMISSIONS.DOCK_INSPECT, PERMISSIONS.LOGISTICS_READ],
  none: [] as string[],
};

function signedInAs(perms: string[], extra: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn().mockResolvedValue({ mfaRequired: false }),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: (p: string) => perms.includes(p),
    callApi: vi.fn(),
    status: 'authenticated',
    me: null,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
    ...extra,
  });
}

/** Every desk renders its own path, so a test can see where he landed. */
function renderAt(path: string, state?: unknown) {
  const desk = (p: string) => <p>{`desk ${p}`}</p>;
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomeRedirect />} />
        <Route
          path="/"
          element={
            <RequireAuth permission={PERMISSIONS.EMPLOYEE_READ} redirectHomeIfDenied>
              {desk('/')}
            </RequireAuth>
          }
        />
        {['/founder', '/controller', '/accounts', '/sales', '/purchase', '/logistics'].map((p) => (
          <Route key={p} path={p} element={desk(p)} />
        ))}
        <Route
          path="/sales/buyers/:id"
          element={
            <RequireAuth permission={PERMISSIONS.SALES_WORKLIST_READ}>
              {desk('/sales/buyers')}
            </RequireAuth>
          }
        />
        <Route
          path="/manage/margin-matrix"
          element={
            <RequireAuth permission={PERMISSIONS.MARGIN_MATRIX_READ}>{desk('matrix')}</RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Each person lands on his own desk (30 Oct)', () => {
  it.each([
    ['admin', '/'],
    ['founder', '/founder'],
    ['controller', '/controller'],
    ['accounts', '/accounts'],
    ['sales', '/sales'],
    ['purchase', '/purchase'],
    ['salesLeaderAlsoPurchase', '/sales'],
    ['logistics', '/logistics'],
  ] as const)('%s → %s', (role, path) => {
    const perms = ROLE[role];
    expect(homePathFor((p) => perms.includes(p))).toBe(path);
  });

  it('signing in goes through /home to his desk, not the Team screen', async () => {
    signedInAs(ROLE.sales);
    renderAt('/login');
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 's@trifid.example' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('desk /sales')).toBeInTheDocument();
    expect(screen.queryByText('Not permitted')).toBeNull();
  });

  it('after an expired session, signing in goes back to the page he was on', async () => {
    signedInAs(ROLE.sales, { sessionExpiredNotice: true });
    renderAt('/login', { from: '/sales/buyers/b1' });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 's@trifid.example' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('desk /sales/buyers')).toBeInTheDocument();
  });

  it('after someone signed out on this tab, the next sign-in goes to his own desk', async () => {
    signedInAs(ROLE.purchase);
    renderAt('/login', { from: '/sales/buyers/b1' });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'p@trifid.example' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('desk /purchase')).toBeInTheDocument();
  });

  it('opening / without Team access goes to his desk; Admin still gets Team', () => {
    signedInAs(ROLE.sales);
    renderAt('/');
    expect(screen.getByText('desk /sales')).toBeInTheDocument();
  });

  it("another screen he can't open says so, with Go to my desk", async () => {
    signedInAs(ROLE.sales);
    renderAt('/manage/margin-matrix');
    expect(screen.getByText('Not permitted')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to my desk' }));
    await waitFor(() => expect(screen.getByText('desk /sales')).toBeInTheDocument());
  });

  it('someone with no desk at all is told so and can sign out', () => {
    signedInAs(ROLE.none);
    renderAt('/');
    expect(screen.getByText(/no desk yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
