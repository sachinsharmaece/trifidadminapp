import { apiFetch } from './client';

// M8, BR-293 — a read screen for debugging delivery. `outcomeCode` is a fixed
// list (never free text); a mobile number only ever arrives masked.
export const NOTIFICATION_OUTCOME_CODES = [
  'WA_ACCEPTED',
  'WA_DELIVERED',
  'WA_DELIVERY_FAILED',
  'WA_API_ERROR',
  'WA_NOT_CONFIGURED',
  'TEMPLATE_UNAVAILABLE',
  'NO_RECIPIENT_MOBILE',
  'SMS_STUB_NOT_SENT',
  'SMS_ACCEPTED',
  'SMS_API_ERROR',
  'ESCALATED_TO_STAFF',
  'CAP_SUPPRESSED',
] as const;
export type NotificationOutcomeCode = (typeof NOTIFICATION_OUTCOME_CODES)[number];

export interface NotificationLogItem {
  logId: string;
  sentAt: string;
  templateKey: string;
  channel: string;
  deliveryStatus: string;
  outcomeCode: NotificationOutcomeCode;
  toFirm: string | null;
  toMobileMasked: string;
  httpStatus: number | null;
  providerErrorCode: string | null;
}

export function getNotificationLog(
  accessToken: string,
  filters: { outcomeCode?: NotificationOutcomeCode; cursor?: string },
): Promise<{ items: NotificationLogItem[]; nextCursor?: string }> {
  const params = new URLSearchParams({ limit: '50' });
  if (filters.outcomeCode) params.set('outcomeCode', filters.outcomeCode);
  if (filters.cursor) params.set('cursor', filters.cursor);
  return apiFetch(`/staff/notifications/log?${params.toString()}`, { accessToken });
}

export interface PausedTemplateItem {
  templateKey: string;
  language: 'en' | 'hi';
  metaTemplateName: string;
  status: string;
  since: string | null;
}

export interface StaffQueueItem {
  outboxId: string;
  templateKey: string;
  toFirm: string | null;
  toMobileMasked: string;
  queuedAt: string;
}

export interface NotificationWorklist {
  pausedTemplates: PausedTemplateItem[];
  staffQueue: StaffQueueItem[];
}

export function getNotificationWorklist(accessToken: string): Promise<NotificationWorklist> {
  return apiFetch('/staff/notifications/worklist', { accessToken });
}
