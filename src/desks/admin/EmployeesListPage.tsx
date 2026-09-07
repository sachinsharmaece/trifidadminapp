import { useCallback } from 'react';
import { getEmployees } from '../../api/admin';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';

/**
 * MASTER_PLAN.md §M1/§M2 — "one real screen fed by live data end to end, to
 * prove the whole chain works." The employee list from GET /admin/employees
 * is the one this session builds.
 */
export function EmployeesListPage() {
  const { callApi, logout } = useAuth();

  const loader = useCallback(() => callApi((token) => getEmployees(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <main>
      <header className="page-header">
        <h1>Employees</h1>
        <button type="button" onClick={() => void logout()}>
          Sign out
        </button>
      </header>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No employees yet.">
        {(employees) => (
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
              {employees.map((employee) => (
                <tr key={employee.employeeId}>
                  <td>{employee.person}</td>
                  <td>{employee.email}</td>
                  <td>{employee.roleKeys.join(', ')}</td>
                  <td>{employee.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
    </main>
  );
}
