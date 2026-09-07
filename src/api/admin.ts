import { apiFetch } from './client';
import type { EmployeeListItem, LaneBoardItem } from './dto';

// API-134
export function getEmployees(accessToken: string): Promise<EmployeeListItem[]> {
  return apiFetch('/admin/employees', { accessToken });
}

// API-132 — BR-262: the save fails unless the lane board is fully covered
// once this employee's own laneKeys are added.
export function createEmployee(
  accessToken: string,
  input: {
    person: string;
    email: string;
    password: string;
    roleKeys: string[];
    laneKeys?: string[];
  },
): Promise<{ employeeId: string; mfaSecret?: string; mfaOtpauthUrl?: string }> {
  return apiFetch('/admin/employees', { method: 'POST', body: input, accessToken });
}

// New — the lane board screen.
export function getLaneBoard(accessToken: string): Promise<LaneBoardItem[]> {
  return apiFetch('/admin/lanes', { accessToken });
}

// API-133
export function createAbsence(
  accessToken: string,
  input: { employeeId: string; from: string; returnDate: string; coveredBy: string },
): Promise<{ absenceId: string }> {
  return apiFetch('/admin/absences', { method: 'POST', body: input, accessToken });
}
