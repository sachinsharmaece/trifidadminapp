import { useCallback, useState } from 'react';
import {
  getNotificationLog,
  getNotificationWorklist,
  NOTIFICATION_OUTCOME_CODES,
  type NotificationOutcomeCode,
} from '../../api/notification';
import { useAuth } from '../../auth/AuthContext';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { Table, Th, Td } from '../../components/ui/Table';
import { useAsyncData } from '../../lib/useAsyncData';

/**
 * New — M8, BR-293. A read screen for debugging delivery issues: what was sent,
 * to whom, and what happened. Not a management console — nothing here sends,
 * retries or edits a message. Outcome codes are a fixed list, never free text.
 * A mobile number only ever appears masked.
 */
export function NotificationLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
      <WorklistSection />
      <LogSection />
    </div>
  );
}

function WorklistSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getNotificationWorklist(token)), [callApi]);
  const { state, retry } = useAsyncData(
    loader,
    (w) => w.pausedTemplates.length === 0 && w.staffQueue.length === 0,
    [loader],
  );

  return (
    <Card title="Needs a person">
      <AsyncBoundary
        state={state}
        onRetry={retry}
        emptyMessage="No paused templates, and nothing waiting on the staff queue."
      >
        {(worklist) => (
          <div className="flex flex-col gap-6">
            {worklist.pausedTemplates.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  Templates Meta has paused or rejected (BR-295)
                </h3>
                <p className="mb-2 text-sm text-slate-500">
                  Messages needing these are not sent. The generic fallback stays approved and
                  unused until a person chooses to use it.
                </p>
                <Table>
                  <thead>
                    <tr>
                      <Th>Template</Th>
                      <Th>Language</Th>
                      <Th>Status</Th>
                      <Th>Since</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {worklist.pausedTemplates.map((t) => (
                      <tr key={`${t.templateKey}-${t.language}`}>
                        <Td>{t.templateKey}</Td>
                        <Td>{t.language}</Td>
                        <Td>
                          <Badge tone="bad">{t.status}</Badge>
                        </Td>
                        <Td>{t.since ? new Date(t.since).toLocaleString() : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
            {worklist.staffQueue.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  Undelivered after four hours — call them (BR-292)
                </h3>
                <Table>
                  <thead>
                    <tr>
                      <Th>Message</Th>
                      <Th>Firm</Th>
                      <Th>Mobile</Th>
                      <Th>Queued</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {worklist.staffQueue.map((q) => (
                      <tr key={q.outboxId}>
                        <Td>{q.templateKey}</Td>
                        <Td>{q.toFirm ?? '—'}</Td>
                        <Td>{q.toMobileMasked}</Td>
                        <Td>{new Date(q.queuedAt).toLocaleString()}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function toneFor(code: NotificationOutcomeCode): BadgeTone {
  if (code === 'WA_DELIVERED' || code === 'WA_ACCEPTED' || code === 'SMS_ACCEPTED') return 'good';
  if (code === 'CAP_SUPPRESSED' || code === 'SMS_STUB_NOT_SENT' || code === 'WA_NOT_CONFIGURED') {
    return 'neutral';
  }
  if (code === 'ESCALATED_TO_STAFF') return 'warn';
  return 'bad';
}

function LogSection() {
  const { callApi } = useAuth();
  const [outcome, setOutcome] = useState<NotificationOutcomeCode | ''>('');
  const loader = useCallback(
    () => callApi((token) => getNotificationLog(token, { outcomeCode: outcome || undefined })),
    [callApi, outcome],
  );
  const { state, retry } = useAsyncData(loader, (page) => page.items.length === 0, [loader]);

  return (
    <Card title="Delivery log — the latest 50 attempts">
      <div className="mb-4 max-w-xs">
        <Select
          id="nl-outcome"
          label="Outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as NotificationOutcomeCode | '')}
        >
          <option value="">All outcomes</option>
          {NOTIFICATION_OUTCOME_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </div>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No attempts logged yet.">
        {(page) => (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Message</Th>
                <Th>To</Th>
                <Th>Channel</Th>
                <Th>Status</Th>
                <Th>Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <tr key={item.logId}>
                  <Td>{new Date(item.sentAt).toLocaleString()}</Td>
                  <Td>{item.templateKey}</Td>
                  <Td>
                    {item.toFirm ?? '—'}{' '}
                    <span className="text-slate-400">{item.toMobileMasked}</span>
                  </Td>
                  <Td>{item.channel}</Td>
                  <Td>{item.deliveryStatus}</Td>
                  <Td>
                    <Badge tone={toneFor(item.outcomeCode)}>{item.outcomeCode}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}
