import { apiFetch } from './client';
import type { EmployeeListItem } from './dto';

// API-134
export function getEmployees(accessToken: string): Promise<EmployeeListItem[]> {
  return apiFetch('/admin/employees', { accessToken });
}
