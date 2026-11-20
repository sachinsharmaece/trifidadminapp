import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { ROLES, type Role } from '@/types/roles';

/** One staff member, as GET /users describes them. */
const staffMemberSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(ROLES),
  active: z.boolean(),
  mustChangePassword: z.boolean(),
});

export type StaffMember = z.infer<typeof staffMemberSchema>;

const staffListSchema = z.object({ users: z.array(staffMemberSchema) });
const createdSchema = z.object({ user: staffMemberSchema, temporaryPassword: z.string() });
const updatedSchema = z.object({ user: staffMemberSchema });
const resetSchema = z.object({ temporaryPassword: z.string() });

export async function listStaff(signal?: AbortSignal): Promise<StaffMember[]> {
  const { data } = await apiClient.get<unknown>('/users', { signal });
  return staffListSchema.parse(data).users;
}

/** The server makes up the temporary password and returns it this one time. */
export async function createStaff(input: { name: string; email: string; role: Role }) {
  const { data } = await apiClient.post<unknown>('/users', input);
  return createdSchema.parse(data);
}

export async function updateStaff(
  id: string,
  changes: { name?: string; role?: Role; active?: boolean },
): Promise<StaffMember> {
  const { data } = await apiClient.patch<unknown>(`/users/${id}`, changes);
  return updatedSchema.parse(data).user;
}

export async function resetStaffPassword(id: string): Promise<string> {
  const { data } = await apiClient.post<unknown>(`/users/${id}/reset-password`);
  return resetSchema.parse(data).temporaryPassword;
}
