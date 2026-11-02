import { apiFetch } from './client';

/** Phase 6 — the bell: a staff member's own in-app notices. */
export interface StaffNotice {
  noticeId: string;
  kind: 'push_received' | 'push_approved' | 'push_rejected';
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function listNotices(
  accessToken: string,
): Promise<{ items: StaffNotice[]; unread: number }> {
  return apiFetch('/staff/notices', { accessToken });
}

export function markNoticeRead(accessToken: string, noticeId: string): Promise<{ read: true }> {
  return apiFetch(`/staff/notices/${noticeId}/read`, { method: 'POST', body: {}, accessToken });
}

export function markAllNoticesRead(accessToken: string): Promise<{ read: true }> {
  return apiFetch('/staff/notices/read-all', { method: 'POST', body: {}, accessToken });
}
