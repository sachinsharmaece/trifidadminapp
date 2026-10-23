import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { deactivateEmployee, getDeactivationImpact } from '../../../api/admin';
import type { DeactivationImpact, EmployeeListItem } from '../../../api/dto';
import { useAuth } from '../../../auth/AuthContext';
import { useFormSubmit } from '../../../lib/useFormSubmit';
import { Modal } from '../../../components/ui/Modal';
import { Input, Select } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Loader } from '../../../components/ui/Loader';

/**
 * Phase 2 — switching an employee off. If he owns buyers, holds lanes, has
 * people reporting to him, or Accounts/Logistics staff work for his team,
 * the counts are shown and one person takes all of it over, in the same
 * step. The default heir is his own leader; for a leader with a team, an
 * Admin picks (another leader of that department).
 */
export function DeactivateDialog({
  employee,
  employees,
  onClose,
  onDone,
}: {
  employee: EmployeeListItem;
  employees: EmployeeListItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { callApi } = useAuth();
  const [impact, setImpact] = useState<DeactivationImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const save = useFormSubmit<unknown>({
    fields: ['reassignToEmployeeId'],
    success: `${employee.person} is switched off.`,
    onSuccess: onDone,
  });

  useEffect(() => {
    callApi((token) => getDeactivationImpact(token, employee.employeeId))
      .then((result) => {
        setImpact(result);
        setTarget(result.defaultReassignTo?.employeeId ?? '');
      })
      .catch(() => setLoadError('Could not check what this person holds.'));
  }, [callApi, employee.employeeId]);

  const candidates = employees.filter((e) => e.active && e.employeeId !== employee.employeeId);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void save.submit((key) =>
      callApi((token) =>
        deactivateEmployee(
          token,
          employee.employeeId,
          {
            ...(impact?.needsReassign ? { reassignToEmployeeId: target } : {}),
            ...(reason.trim() ? { reason: reason.trim() } : {}),
          },
          key,
        ),
      ),
    );
  }

  return (
    <Modal open title={`Switch off ${employee.person}`} onClose={onClose}>
      {loadError && <p className="text-sm text-danger-500">{loadError}</p>}
      {!impact && !loadError && <Loader />}
      {impact && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            He will not be able to sign in, his open sessions end now, and he disappears from every
            assign and reports-to list. He can be switched back on later.
          </p>
          {impact.needsReassign ? (
            <>
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {impact.buyersOwned > 0 && <li>{impact.buyersOwned} buyer(s) assigned to him</li>}
                {impact.sellersOwned > 0 && (
                  <li>{impact.sellersOwned} seller(s) assigned to him</li>
                )}
                {impact.laneKeys.length > 0 && <li>Lanes {impact.laneKeys.join(', ')}</li>}
                {impact.directReports.length > 0 && (
                  <li>
                    {impact.directReports.length} report(s):{' '}
                    {impact.directReports.map((r) => r.person).join(', ')}
                  </li>
                )}
                {impact.teamMembersServed > 0 && (
                  <li>{impact.teamMembersServed} Accounts/Logistics staff work for his team</li>
                )}
              </ul>
              <Select
                label="Reassign everything to"
                required
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  save.clearFieldError('reassignToEmployeeId');
                }}
                hint={
                  impact.directReports.length > 0
                    ? 'He leads a team — pick another leader of that department.'
                    : impact.defaultReassignTo
                      ? 'His own leader is picked to start with.'
                      : undefined
                }
                error={save.fieldErrors.reassignToEmployeeId}
              >
                <option value="">Select…</option>
                {candidates.map((c) => (
                  <option key={c.employeeId} value={c.employeeId}>
                    {c.person}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <p className="text-sm text-slate-700">
              He holds no buyers, lanes or team — nothing to hand over.
            </p>
          )}
          <Input
            label="Reason"
            hint="Optional"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {save.formError && (
            <p role="alert" className="text-sm text-danger-500">
              {save.formError}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              loading={save.submitting}
              disabled={impact.needsReassign && !target}
            >
              Switch off
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
