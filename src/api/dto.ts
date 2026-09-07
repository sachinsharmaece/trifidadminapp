/**
 * Copied from trifid-serverapp/src/shared/dto/identity.dto.ts (TD-008,
 * API_CONTRACT.md §11.2). Only the staff-facing type is needed in this
 * repository — trifid-adminapp never handles a counterparty session.
 */
export interface StaffMeDto {
  actorType: 'staff';
  employeeId: string;
  email: string;
  person: string;
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
}

export interface EmployeeListItem {
  employeeId: string;
  person: string;
  email: string;
  desk?: string;
  roleKeys: string[];
  active: boolean;
  mfaEnabled: boolean;
}
