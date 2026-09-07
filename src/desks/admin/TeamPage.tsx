import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { getEmployees, createEmployee, getLaneBoard, createAbsence } from '../../api/admin';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_KEYS } from '../../lib/permissions';
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
    <main>
      <h1>Team</h1>

      <section>
        <h2>Employees</h2>
        <AsyncBoundary
          state={employees.state}
          onRetry={employees.retry}
          emptyMessage="No employees yet."
        >
          {(items) => <EmployeeTable items={items} />}
        </AsyncBoundary>
      </section>

      <section>
        <h2>Lane board</h2>
        <p className="hint">
          {'CH §17.12.5 — read-only. Allocation happens by creating an employee with lanes below.'}
        </p>
        <AsyncBoundary state={lanes.state} onRetry={lanes.retry} emptyMessage="No lanes seeded.">
          {(items) => <LaneTable items={items} />}
        </AsyncBoundary>
      </section>

      <section>
        <h2>Create employee</h2>
        <CreateEmployeeForm
          laneOptions={lanes.state.status === 'success' ? lanes.state.data : []}
          onCreated={reloadAll}
        />
      </section>

      <section>
        <h2>Record an absence</h2>
        <AbsenceForm
          key={reloadKey}
          employees={employees.state.status === 'success' ? employees.state.data : []}
          onRecorded={reloadAll}
        />
      </section>
    </main>
  );
}

function EmployeeTable({ items }: { items: EmployeeListItem[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Roles</th>
          <th>Active</th>
        </tr>
      </thead>
      <tbody>
        {items.map((employee) => (
          <tr key={employee.employeeId}>
            <td>{employee.person}</td>
            <td>{employee.email}</td>
            <td>{employee.roleKeys.join(', ')}</td>
            <td>{employee.active ? 'Yes' : 'No'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LaneTable({ items }: { items: LaneBoardItem[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Lane</th>
          <th>Label</th>
          <th>Holder</th>
          <th>Currently covered by</th>
        </tr>
      </thead>
      <tbody>
        {items.map((lane) => (
          <tr key={lane.laneKey}>
            <td>{lane.laneKey}</td>
            <td>{lane.label}</td>
            <td>
              {lane.isCovered ? lane.holderName : <span className="note-urgent">Unheld</span>}
            </td>
            <td>
              {lane.isCovered && lane.effectiveHolderEmployeeId !== lane.holderEmployeeId
                ? lane.effectiveHolderName
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
    <form onSubmit={handleSubmit}>
      <label htmlFor="ce-person">Name</label>
      <input id="ce-person" value={person} onChange={(e) => setPerson(e.target.value)} required />

      <label htmlFor="ce-email">Email</label>
      <input
        id="ce-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="ce-password">Password</label>
      <input
        id="ce-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <fieldset>
        <legend>Roles</legend>
        {ROLE_KEYS.map((key) => (
          <label key={key} className="checkbox-row">
            <input
              type="checkbox"
              checked={roleKeys.includes(key)}
              onChange={() => toggle(roleKeys, setRoleKeys, key)}
            />
            {key}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Lanes (optional)</legend>
        {laneOptions.map((lane) => (
          <label key={lane.laneKey} className="checkbox-row">
            <input
              type="checkbox"
              disabled={lane.isCovered}
              checked={laneKeys.includes(lane.laneKey)}
              onChange={() => toggle(laneKeys, setLaneKeys, lane.laneKey)}
            />
            {lane.laneKey} — {lane.label} {lane.isCovered ? '(held)' : ''}
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      {success && <p className="note">{success}</p>}

      <button type="submit" disabled={submitting || roleKeys.length === 0}>
        {submitting ? 'Creating…' : 'Create employee'}
      </button>
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
    <form onSubmit={handleSubmit}>
      <label htmlFor="ab-employee">Who is away</label>
      <select
        id="ab-employee"
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
      </select>

      <label htmlFor="ab-coveredby">Covered by</label>
      <select
        id="ab-coveredby"
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
      </select>

      <label htmlFor="ab-from">From</label>
      <input
        id="ab-from"
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        required
      />

      <label htmlFor="ab-return">Return date</label>
      <input
        id="ab-return"
        type="date"
        value={returnDate}
        onChange={(e) => setReturnDate(e.target.value)}
        required
      />

      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      {success && <p className="note">Recorded.</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Record absence'}
      </button>
    </form>
  );
}
