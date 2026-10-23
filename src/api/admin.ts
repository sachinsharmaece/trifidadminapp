import { apiFetch } from './client';
import type {
  DeactivationImpact,
  EducationLevel,
  EmployeeDetail,
  EmployeeListItem,
  LaneBoardItem,
  Position,
} from './dto';

// API-134 — the Team list. Every assign / reports-to / cover dropdown asks
// for `active`, so a switched-off employee is never offered.
export function getEmployees(
  accessToken: string,
  status: 'active' | 'inactive' | 'all' = 'all',
): Promise<EmployeeListItem[]> {
  return apiFetch(`/admin/employees?status=${status}&limit=500`, { accessToken });
}

export function getEmployee(accessToken: string, employeeId: string): Promise<EmployeeDetail> {
  return apiFetch(`/admin/employees/${employeeId}`, { accessToken });
}

export interface EmployeeHrInput {
  dob: string;
  /** Left out on edit to keep the stored value (the form only ever sees it masked). */
  pan?: string;
  aadhaar?: string;
  fatherName: string;
  fatherMobile: string;
  husbandName: string;
  husbandMobile: string;
  emergencyContact: { name: string; relation: string; mobile: string };
  permanentAddress: string;
  currentSameAsPermanent: boolean;
  currentAddress: string;
  education: { level: EducationLevel | null; other: string };
}

export interface EmployeeInput {
  person: string;
  email: string;
  mobile: string;
  roleKeys: string[];
  positions: Position[];
  reportsToSalesLeaderId: string | null;
  reportsToPurchaseLeaderId: string | null;
  worksForTeamLeaderIds: string[];
  worksForAllTeams: boolean;
  hr: EmployeeHrInput;
}

// API-132 — BR-262: the save fails unless the lane board is fully covered
// once this employee's own laneKeys are added.
export function createEmployee(
  accessToken: string,
  input: EmployeeInput & { password: string; laneKeys?: string[] },
  idempotencyKey: string,
): Promise<{ employeeId: string; mfaSecret?: string; mfaOtpauthUrl?: string }> {
  return apiFetch('/admin/employees', {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

/** Phase 2 — Edit. An empty password keeps the current one. */
export function updateEmployee(
  accessToken: string,
  employeeId: string,
  input: EmployeeInput & { password: string },
  idempotencyKey: string,
): Promise<{ employeeId: string; mfaSecret?: string; mfaOtpauthUrl?: string }> {
  return apiFetch(`/admin/employees/${employeeId}`, {
    method: 'PUT',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export function getDeactivationImpact(
  accessToken: string,
  employeeId: string,
): Promise<DeactivationImpact> {
  return apiFetch(`/admin/employees/${employeeId}/deactivation-impact`, { accessToken });
}

export function deactivateEmployee(
  accessToken: string,
  employeeId: string,
  input: { reassignToEmployeeId?: string; reason?: string },
  idempotencyKey: string,
): Promise<{ deactivated: true }> {
  return apiFetch(`/admin/employees/${employeeId}/deactivate`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export function reactivateEmployee(
  accessToken: string,
  employeeId: string,
  idempotencyKey: string,
): Promise<{ reactivated: true }> {
  return apiFetch(`/admin/employees/${employeeId}/reactivate`, {
    method: 'POST',
    accessToken,
    idempotencyKey,
  });
}

/** Admin only, audited (DEC-061). */
export function revealEmployeePii(
  accessToken: string,
  employeeId: string,
  field: 'pan' | 'aadhaar',
): Promise<{ field: 'pan' | 'aadhaar'; value: string }> {
  return apiFetch(`/admin/employees/${employeeId}/reveal`, {
    method: 'POST',
    body: { field },
    accessToken,
  });
}

// New — the lane board screen.
export function getLaneBoard(accessToken: string): Promise<LaneBoardItem[]> {
  return apiFetch('/admin/lanes', { accessToken });
}

// API-133
export function createAbsence(
  accessToken: string,
  input: { employeeId: string; from: string; returnDate: string; coveredBy: string },
  idempotencyKey?: string,
): Promise<{ absenceId: string }> {
  return apiFetch('/admin/absences', {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

// New — B-10. BR-261/BR-276's manual queue-to-book action (the automatic
// trigger fires on a buyer's first order; this is the fallback when it
// hasn't — e.g. no active Sales employee existed at that moment).
export function assignBook(
  accessToken: string,
  input: { buyerId: string; ownerEmployeeId: string; reason?: string },
  idempotencyKey: string,
): Promise<{ bookAssignmentId: string }> {
  return apiFetch('/admin/book-assignments', {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}
