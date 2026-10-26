import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { getRegistration, listRegistrationsPage } from '../src/api/onboarding';
import { RegistrationsPage } from '../src/desks/admin/RegistrationsPage';
import type { RegistrationListItem } from '../src/api/dto';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/territory', () => ({ getTehsils: vi.fn().mockResolvedValue([]) }));
vi.mock('../src/api/onboarding', () => ({
  listRegistrationsPage: vi.fn(),
  getRegistration: vi.fn(),
  getRegistrationBuyerProfile: vi.fn(() => new Promise(() => {})),
  getRegistrationSellerProfile: vi.fn(() => new Promise(() => {})),
  approveBuyer: vi.fn(),
  approveSeller: vi.fn(),
  rejectRegistration: vi.fn(),
}));

const row = (n: number): RegistrationListItem =>
  ({
    registrationId: `r${n}`,
    firm: `Firm ${n}`,
    kind: 'buyer',
    status: 'pending',
    createdAt: '2026-10-26T00:00:00.000Z',
    staffAssisted: true,
    assignedTo: null,
    district: null,
  }) as RegistrationListItem;

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => true,
    status: 'authenticated',
    me: null,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
  vi.mocked(listRegistrationsPage)
    .mockReset()
    .mockImplementation(async (_token, filter) =>
      filter.cursor
        ? { items: [row(3)] }
        : {
            items: [row(1), row(2)].filter((r) => !filter.q || (r.firm ?? '').includes(filter.q)),
            nextCursor: 'c1',
          },
    );
  vi.mocked(getRegistration)
    .mockReset()
    .mockResolvedValue({
      registrationId: 'r1',
      kind: 'buyer',
      status: 'pending',
      firm: 'Firm 1',
      gstin: '',
      staffAssisted: true,
      staffAssistedOtpVerifiedAt: null,
    } as never);
});

function renderPage() {
  render(
    <MemoryRouter>
      <RegistrationsPage />
    </MemoryRouter>,
  );
}

describe('Registrations (26 Oct)', () => {
  it('"Open" shows the registration in a dialog over the list', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Open' }))[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Firm 1')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('"Load more" brings the next page with the cursor', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /load more/i }));
    expect(await screen.findByText('Firm 3')).toBeInTheDocument();
    expect(vi.mocked(listRegistrationsPage).mock.calls.at(-1)![1]).toMatchObject({ cursor: 'c1' });
    expect(screen.getByText(/that is all/)).toBeInTheDocument();
  });

  it('the search box at the top right searches after a pause in typing', async () => {
    renderPage();
    await screen.findByText('Firm 2');
    fireEvent.change(screen.getByLabelText('Search registrations'), {
      target: { value: 'Firm 2' },
    });
    await waitFor(() =>
      expect(vi.mocked(listRegistrationsPage).mock.calls.at(-1)![1]).toMatchObject({ q: 'Firm 2' }),
    );
    await waitFor(() => expect(screen.queryByText('Firm 1')).toBeNull());
  });
});
