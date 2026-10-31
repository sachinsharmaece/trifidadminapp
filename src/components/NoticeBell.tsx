import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { listNotices, markAllNoticesRead, markNoticeRead, type StaffNotice } from '../api/notices';
import { useAuth } from '../auth/AuthContext';
import { timeAgo } from '../lib/timeAgo';

const POLL_MS = 60_000;

/**
 * Phase 6 — the bell: this staff member's own notices (a push received,
 * approved, rejected). Best-effort — if it fails to load it shows nothing
 * and never blocks the shell.
 */
export function NoticeBell() {
  const { callApi, me } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<StaffNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const isStaff = me?.actorType === 'staff';

  const load = useCallback(async () => {
    try {
      const result = await callApi((token) => listNotices(token));
      setItems(result.items);
      setUnread(result.unread);
    } catch {
      // A bell that cannot load stays quiet.
    }
  }, [callApi]);

  useEffect(() => {
    if (!isStaff) return;
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [isStaff, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!isStaff) return null;

  async function openNotice(notice: StaffNotice): Promise<void> {
    setOpen(false);
    if (!notice.read) {
      try {
        await callApi((token) => markNoticeRead(token, notice.noticeId));
      } catch {
        // Reading it is still the point; the count catches up on the next poll.
      }
      void load();
    }
    if (notice.link) navigate(notice.link);
  }

  async function readAll(): Promise<void> {
    try {
      await callApi((token) => markAllNoticesRead(token));
    } finally {
      void load();
    }
  }

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        aria-label={unread ? `Notices, ${unread} unread` : 'Notices'}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <FiBell className="text-lg" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-4 top-16 z-50 rounded-md border border-slate-200 bg-white shadow-lg md:absolute md:inset-x-auto md:top-auto md:left-0 md:mt-2 md:w-80">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <span className="text-sm font-semibold text-slate-900">Notices</span>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-brand-600 hover:underline"
                onClick={() => void readAll()}
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">Nothing yet.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto md:max-h-96">
              {items.map((notice) => (
                <li key={notice.noticeId}>
                  <button
                    type="button"
                    onClick={() => void openNotice(notice)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      notice.read ? 'text-slate-500' : 'text-slate-900'
                    }`}
                  >
                    <span className={notice.read ? '' : 'font-medium'}>{notice.title}</span>
                    <span className="block text-xs text-slate-500">{notice.body}</span>
                    <span className="block text-[11px] text-slate-400">
                      {timeAgo(notice.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
