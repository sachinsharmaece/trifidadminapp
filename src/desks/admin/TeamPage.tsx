import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiUserPlus, FiCalendar } from 'react-icons/fi';
import { getEmployees, createEmployee, getLaneBoard, createAbsence } from '../../api/admin';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_KEYS } from '../../lib/permissions';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { EmployeeListItem, LaneBoardItem } from '../../api/dto';

/**
 * MASTER_PLAN.md §M3 — the employee and lane board, in one screen, on
 * purpose: `CH §17.12.5` describes exactly this as "the Team screen",
 * allocation happening nowhere else.
 */
export function TeamPage() {
  const { callApi } = useAuth();

  const employeesLoader = useCallback(() => callApi((token) => getEmployees(token)), [callApi]);
  const employees = useAsyncData(employeesLoader, (items) => items.length === 0, [employeesLoader]);

  const lanesLoader = useCallback(() => callApi((token) => getLaneBoard(token)), [callApi]);
  const lanes = useAsyncData(lanesLoader, (items) => items.length === 0, [lanesLoader]);

  const [reloadKey, setReloadKey] = useState(0);
  const reloadAll = () => {
    employees.retry();
    lanes.retry();
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Team</h1>

      <Card title="Employees">
        <AsyncBoundary
          state={employees.state}
          onRetry={employees.retry}
          emptyMessage="No employees yet."
        >
          {(items) => <EmployeeTable items={items} />}
        </AsyncBoundary>
      </Card>

      <Card title="Lane board">
        <p className="mb-4 text-sm text-slate-500">
          CH §17.12.5 — read-only. Allocation happens by creating an employee with lanes below.
        </p>
        <AsyncBoundary state={lanes.state} onRetry={lanes.retry} emptyMessage="No lanes seeded.">
          {(items) => <LaneTable items={items} />}
        </AsyncBoundary>
      </Card>

      <Card title="Create employee">
        <CreateEmployeeForm
          laneOptions={lanes.state.status === 'success' ? lanes.state.data : []}
          onCreated={reloadAll}
        />
      </Card>

      <Card title="Record an absence">
        <AbsenceForm
          key={reloadKey}
          employees={employees.state.status === 'success' ? employees.state.data : []}
          onRecorded={reloadAll}
        />
      </Card>
    </div>
  );
}

function EmployeeTable({ items }: { items: EmployeeListItem[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Roles</Th>
          <Th>Active</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((employee) => (
          <tr key={employee.employeeId}>
            <Td>{employee.person}</Td>
            <Td>{employee.email}</Td>
            <Td>{employee.roleKeys.join(', ')}</Td>
            <Td>
              <Badge tone={employee.active ? 'good' : 'neutral'}>
                {employee.active ? 'Yes' : 'No'}
              </Badge>
            </Td>
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

function CreateEmployeeForm({
  laneOptions,
  onCreated,
}: {
  laneOptions: LaneBoardItem[];
  onCreated: () => void;
}) {
  const { callApi } = useAuth();
  const [person, setPerson] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleKeys, setRoleKeys] = useState<string[]>([]);
  const [laneKeys, setLaneKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, key: string) {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await callApi((token) =>
        createEmployee(token, { person, email, password, roleKeys, laneKeys }),
      );
      setSuccess(
        result.mfaSecret
          ? `Created. MFA secret (hand to the employee once): ${result.mfaSecret}`
          : 'Created.',
      );
      setPerson('');
      setEmail('');
      setPassword('');
      setRoleKeys([]);
      setLaneKeys([]);
      onCreated();
    } catch (submitError) {
      // BR-262 — the server's rejection is shown verbatim rather than just
      // disabling the button, since the message names exactly which lanes
      // are still unheld.
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not create this employee.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <Input
        id="ce-person"
        label="Name"
        value={person}
        onChange={(e) => setPerson(e.target.value)}
        required
      />
      <Input
        id="ce-email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="ce-password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <fieldset className="rounded-md border border-slate-300 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Roles</legend>
        <div className="flex flex-col gap-2">
          {ROLE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={roleKeys.includes(key)}
                onChange={() => toggle(roleKeys, setRoleKeys, key)}
              />
              {key}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-slate-300 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Lanes (optional)</legend>
        <div className="flex flex-col gap-2">
          {laneOptions.map((lane) => (
            <label key={lane.laneKey} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                disabled={lane.isCovered}
                checked={laneKeys.includes(lane.laneKey)}
                onChange={() => toggle(laneKeys, setLaneKeys, lane.laneKey)}
              />
              {lane.laneKey} — {lane.label} {lane.isCovered ? '(held)' : ''}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-success-600">{success}</p>}

      <Button
        type="submit"
        loading={submitting}
        disabled={roleKeys.length === 0}
        icon={<FiUserPlus />}
      >
        Create employee
      </Button>
    </form>
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await callApi((token) =>
        createAbsence(token, {
          employeeId,
          coveredBy,
          from: new Date(from).toISOString(),
          returnDate: new Date(returnDate).toISOString(),
        }),
      );
      setSuccess(true);
      onRecorded();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not record this absence.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <Select
        id="ab-employee"
        label="Who is away"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
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
        required
      />

      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-success-600">Recorded.</p>}

      <Button type="submit" loading={submitting} icon={<FiCalendar />}>
        Record absence
      </Button>
    </form>
  );
}
