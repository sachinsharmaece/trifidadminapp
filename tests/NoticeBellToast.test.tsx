import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { listNotices, type StaffNotice } from '../src/api/notices';
import { NoticeBell } from '../src/components/NoticeBell';

const show = vi.fn();

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/notices', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/notices')>()),
  listNotices: vi.fn(),
}));
vi.mock('../src/components/ui/Toast', () => ({ useOptionalToast: () => ({ show }) }));

const POLL_MS = 60_000;
let employee = 0;

beforeEach(() => {
  vi.useFakeTimers();
  show.mockReset();
  vi.mocked(listNotices).mockReset();
  // The bell remembers what it has told each person, so every test is a new person.
  employee += 1;
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => true,
    status: 'authenticated',
    me: { actorType: 'staff', employeeId: `emp-${employee}` } as never,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const notice = (id: string, over: Partial<StaffNotice> = {}): StaffNotice => ({
  noticeId: id,
  kind: 'pile_stuck',
  title: `Confirmation not completed: WEEDMAR SUPER ${id}`,
  body: '20 boxes confirmed 12 min ago and the buyers have no deal yet.',
  link: '/purchase/confirmations',
  read: false,
  createdAt: '2026-11-07T06:00:00.000Z',
  ...over,
});
const reply = (items: StaffNotice[]) => ({
  items,
  unread: items.filter((n) => !n.read).length,
});

const bells = (count = 1) =>
  render(
    <MemoryRouter>
      {Array.from({ length: count }, (_, i) => (
        <NoticeBell key={i} />
      ))}
    </MemoryRouter>,
  );
const poll = () => act(() => vi.advanceTimersByTimeAsync(POLL_MS));
const firstLoad = () => act(() => vi.advanceTimersByTimeAsync(0));

describe('the bell toasts a notice that arrives while the app is open', () => {
  it('stays quiet about notices that were already there when the page opened', async () => {
    vi.mocked(listNotices).mockResolvedValue(reply([notice('a')]));
    bells();
    await firstLoad();
    expect(listNotices).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalled();
  });

  it('toasts the title of a new unread notice, and holds it long enough to read', async () => {
    vi.mocked(listNotices)
      .mockResolvedValueOnce(reply([notice('a')]))
      .mockResolvedValue(reply([notice('b'), notice('a')]));
    bells();
    await firstLoad();
    await poll();

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith('Confirmation not completed: WEEDMAR SUPER b', {
      durationMs: 8000,
    });
  });

  it('says how many arrived when several come at once', async () => {
    vi.mocked(listNotices)
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValue(reply([notice('c'), notice('b')]));
    bells();
    await firstLoad();
    await poll();

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(
      '2 new notices: Confirmation not completed: WEEDMAR SUPER c',
      { durationMs: 8000 },
    );
  });

  it('never toasts the same notice twice', async () => {
    vi.mocked(listNotices)
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValue(reply([notice('b')]));
    bells();
    await firstLoad();
    await poll();
    await poll();
    await poll();

    expect(show).toHaveBeenCalledTimes(1);
  });

  it('does not toast a notice that has already been read', async () => {
    vi.mocked(listNotices)
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValue(reply([notice('b', { read: true })]));
    bells();
    await firstLoad();
    await poll();

    expect(show).not.toHaveBeenCalled();
  });

  it('toasts once when the sidebar and the phone bar both show a bell', async () => {
    vi.mocked(listNotices)
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValue(reply([notice('b')]));
    bells(2);
    await firstLoad();
    await poll();

    expect(listNotices).toHaveBeenCalledTimes(4); // Both bells poll...
    expect(show).toHaveBeenCalledTimes(1); // ...the person is told once.
  });
});
