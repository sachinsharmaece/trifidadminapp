import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiCalendar, FiEdit2, FiPower, FiUserPlus } from 'react-icons/fi';
import {
  createAbsence,
  getEmployee,
  getEmployees,
  getLaneBoard,
  reactivateEmployee,
} from '../../api/admin';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { EmployeeDetail, EmployeeListItem, LaneBoardItem, Position } from '../../api/dto';
import { EmployeeForm } from './team/EmployeeForm';
import { DeactivateDialog } from './team/DeactivateDialog';

const POSITION_SHORT: Record<Position, string> = {
  SALES_LEADER: 'Sales Leader',
  PURCHASE_LEADER: 'Purchase Leader',
  SALES_EXEC: 'Sales Exec',
  PURCHASE_EXEC: 'Purchase Exec',
};

type StatusFilter = 'active' | 'inactive' | 'all';

/**
 * MASTER_PLAN.md §M3 — the employee and lane board, in one screen, on
 * purpose: `CH §17.12.5` describes exactly this as "the Team screen",
 * allocation happening nowhere else.
 *
 * Phase 2 — positions and reporting lines, HR details, Edit, and switching
 * an employee off (with hand-over) or back on. Inactive staff show greyed
 * and are left out of every pick list.
 */
export function TeamPage() {
  const { callApi, hasPermission } = useAuth();
  const canWrite = hasPermission(PERMISSIONS.EMPLOYEE_WRITE);
  const [status, setStatus] = useState<StatusFilter>('active');
  const [editing, setEditing] = useState<EmployeeDetail | null>(null);
  const [switchingOff, setSwitchingOff] = useState<EmployeeListItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const listLoader = useCallback(
    () => callApi((token) => getEmployees(token, status)),
    [callApi, status],
  );
  const list = useAsyncData(listLoader, (items) => items.length === 0, [listLoader]);

  // Pick lists always draw on active staff, whatever the table filter shows.
  const activeLoader = useCallback(
    () => callApi((token) => getEmployees(token, 'active')),
    [callApi],
  );
  const active = useAsyncData(activeLoader, () => false, [activeLoader]);
  const activeEmployees = active.state.status === 'success' ? active.state.data : [];

  const lanesLoader = useCallback(() => callApi((token) => getLaneBoard(token)), [callApi]);
  const lanes = useAsyncData(lanesLoader, (items) => items.length === 0, [lanesLoader]);

  const [reloadKey, setReloadKey] = useState(0);
  const reloadAll = () => {
    list.retry();
    active.retry();
    lanes.retry();
    setReloadKey((key) => key + 1);
  };

  const reactivate = useFormSubmit<unknown>({
    success: 'Switched back on.',
    onSuccess: () => {
      setNotice('Switched back on.');
      reloadAll();
    },
  });

  async function openEdit(employeeId: string): Promise<void> {
    setNotice(null);
    const detail = await callApi((token) => getEmployee(token, employeeId));
    setEditing(detail);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Team</h1>
      <DevNote screen="admin_team" />

      <Card title="Employees">
        <div className="mb-4 w-48">
          <Select
            label="Show"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </Select>
        </div>
        {notice && <p className="mb-3 text-sm text-success-600">{notice}</p>}
        {reactivate.formError && (
          <p role="alert" className="mb-3 text-sm text-danger-500">
            {reactivate.formError}
          </p>
        )}
        <AsyncBoundary state={list.state} onRetry={list.retry} emptyMessage="No employees here.">
          {(items) => (
            <EmployeeTable
              items={items}
              canWrite={canWrite}
              onEdit={(id) => void openEdit(id)}
              onSwitchOff={(employee) => {
                setNotice(null);
                setSwitchingOff(employee);
              }}
              onSwitchOn={(employee) =>
                void reactivate.submit((key) =>
                  callApi((token) => reactivateEmployee(token, employee.employeeId, key)),
                )
              }
            />
          )}
        </AsyncBoundary>
      </Card>

      {editing && canWrite && (
        <Card title={`Edit ${editing.person}`}>
          <EmployeeForm
            key={editing.employeeId}
            mode="edit"
            detail={editing}
            employees={activeEmployees}
            laneOptions={[]}
            onSaved={reloadAll}
            onCancel={() => setEditing(null)}
          />
        </Card>
      )}

      <Card title="Lane board">
        <p className="mb-4 text-sm text-slate-500">
          CH §17.12.5 — read-only. Allocation happens by creating an employee with lanes below; a
          lane moves to someone else when its holder is switched off.
        </p>
        <AsyncBoundary state={lanes.state} onRetry={lanes.retry} emptyMessage="No lanes seeded.">
          {(items) => <LaneTable items={items} />}
        </AsyncBoundary>
      </Card>

      {canWrite && (
        <Card title="Create employee">
          <EmployeeForm
            key={`create-${reloadKey}`}
            mode="create"
            employees={activeEmployees}
            laneOptions={lanes.state.status === 'success' ? lanes.state.data : []}
            onSaved={reloadAll}
          />
        </Card>
      )}

      <Card title="Record an absence">
        <AbsenceForm key={reloadKey} employees={activeEmployees} onRecorded={reloadAll} />
      </Card>

      {switchingOff && (
        <DeactivateDialog
          employee={switchingOff}
          employees={activeEmployees}
          onClose={() => setSwitchingOff(null)}
          onDone={() => {
            setNotice(`${switchingOff.person} is switched off.`);
            setSwitchingOff(null);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}

function reportsTo(employee: EmployeeListItem): string {
  const parts: string[] = [];
  for (const ref of [employee.reportsToSalesLeader, employee.reportsToPurchaseLeader]) {
    if (!ref) continue;
    parts.push(ref.employeeId === employee.employeeId ? 'Himself' : ref.person);
  }
  return [...new Set(parts)].join(', ') || '—';
}

function EmployeeTable({
  items,
  canWrite,
  onEdit,
  onSwitchOff,
  onSwitchOn,
}: {
  items: EmployeeListItem[];
  canWrite: boolean;
  onEdit: (employeeId: string) => void;
  onSwitchOff: (employee: EmployeeListItem) => void;
  onSwitchOn: (employee: EmployeeListItem) => void;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Mobile</Th>
          <Th>Positions</Th>
          <Th>Reports to</Th>
          <Th>Roles</Th>
          <Th>Status</Th>
          {canWrite && <Th>Actions</Th>}
        </tr>
      </thead>
      <tbody>
        {items.map((employee) => (
          <tr key={employee.employeeId} className={employee.active ? '' : 'opacity-50'}>
            <Td>
              {employee.person}
              {!employee.hrComplete && (
                <>
                  {' '}
                  <Badge tone="warn" variant="chip">
                    HR details missing
                  </Badge>
                </>
              )}
            </Td>
            <Td>{employee.mobile ?? '—'}</Td>
            <Td>{employee.positions.map((p) => POSITION_SHORT[p]).join(', ') || '—'}</Td>
            <Td>{reportsTo(employee)}</Td>
            <Td>{employee.roleKeys.join(', ')}</Td>
            <Td>
              <Badge tone={employee.active ? 'good' : 'neutral'}>
                {employee.active ? 'Active' : 'Inactive'}
              </Badge>
            </Td>
            {canWrite && (
              <Td>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<FiEdit2 />}
                    onClick={() => onEdit(employee.employeeId)}
                  >
                    Edit
                  </Button>
                  {employee.active ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<FiPower />}
                      onClick={() => onSwitchOff(employee)}
                    >
                      Switch off
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<FiUserPlus />}
                      onClick={() => onSwitchOn(employee)}
                    >
                      Switch on
                    </Button>
                  )}
                </div>
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function LaneTable({ items }: { items: LaneBoardItem[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Lane</Th>
          <Th>Label</Th>
          <Th>Holder</Th>
          <Th>Currently covered by</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((lane) => (
          <tr key={lane.laneKey}>
            <Td>{lane.laneKey}</Td>
            <Td>{lane.label}</Td>
            <Td>{lane.isCovered ? lane.holderName : <Badge tone="bad">Unheld</Badge>}</Td>
            <Td>
              {lane.isCovered && lane.effectiveHolderEmployeeId !== lane.holderEmployeeId
                ? lane.effectiveHolderName
                : '—'}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function AbsenceForm({
  employees,
  onRecorded,
}: {
  employees: EmployeeListItem[];
  onRecorded: () => void;
}) {
  const { callApi } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [coveredBy, setCoveredBy] = useState('');
  const [from, setFrom] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const save = useFormSubmit<unknown>({
    fields: ['employeeId', 'coveredBy', 'from', 'returnDate'],
    success: 'Absence recorded.',
    onSuccess: () => {
      setEmployeeId('');
      setCoveredBy('');
      setFrom('');
      setReturnDate('');
      onRecorded();
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void save.submit((key) =>
      callApi((token) =>
        createAbsence(
          token,
          {
            employeeId,
            coveredBy,
            from: new Date(from).toISOString(),
            returnDate: new Date(returnDate).toISOString(),
          },
          key,
        ),
      ),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <Select
        id="ab-employee"
        label="Who is away"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        error={save.fieldErrors.employeeId}
        required
      >
        <option value="">Select…</option>
        {employees.map((employee) => (
          <option key={employee.employeeId} value={employee.employeeId}>
            {employee.person}
          </option>
        ))}
      </Select>

      <Select
        id="ab-coveredby"
        label="Covered by"
        value={coveredBy}
        onChange={(e) => setCoveredBy(e.target.value)}
        error={save.fieldErrors.coveredBy}
        required
      >
        <option value="">Select…</option>
        {employees
          .filter((employee) => employee.employeeId !== employeeId)
          .map((employee) => (
            <option key={employee.employeeId} value={employee.employeeId}>
              {employee.person}
            </option>
          ))}
      </Select>

      <Input
        id="ab-from"
        label="From"
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        required
      />
      <Input
        id="ab-return"
        label="Return date"
        type="date"
        value={returnDate}
        onChange={(e) => setReturnDate(e.target.value)}
        error={save.fieldErrors.returnDate}
        required
      />

      {save.formError && (
        <p role="alert" className="text-sm text-danger-500">
          {save.formError}
        </p>
      )}
      {save.successMessage && <p className="text-sm text-success-600">{save.successMessage}</p>}

      <Button type="submit" loading={save.submitting} icon={<FiCalendar />}>
        Record absence
      </Button>
    </form>
  );
}
