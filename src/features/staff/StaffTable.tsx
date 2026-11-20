import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { useCurrentUser } from '@/features/auth/hooks';
import { ROLES, ROLE_LABELS, type Role } from '@/types/roles';
import type { StaffMember } from './api';
import { useResetStaffPassword, useUpdateStaff } from './hooks';

interface StaffTableProps {
  members: readonly StaffMember[];
  /** Called after a password reset, with the temporary password to hand over. */
  onPasswordReset: (name: string, temporaryPassword: string) => void;
}

export function StaffTable({ members, onPasswordReset }: StaffTableProps) {
  const { data: me } = useCurrentUser();
  const update = useUpdateStaff();
  const reset = useResetStaffPassword();

  // You cannot edit yourself here, and only a Founder can edit a Founder (the server enforces both).
  function canManage(member: StaffMember): boolean {
    return member.id !== me?.id && (member.role !== 'FOUNDER' || me?.role === 'FOUNDER');
  }
  const roles = ROLES.filter((role) => role !== 'FOUNDER' || me?.role === 'FOUNDER');

  function changeRole(member: StaffMember, role: Role) {
    if (role === member.role) return;
    if (!window.confirm(`Change ${member.name} to ${ROLE_LABELS[role]}? They will be signed out.`))
      return;
    update.mutate({ id: member.id, changes: { role } });
  }

  function toggleActive(member: StaffMember) {
    if (
      member.active &&
      !window.confirm(`Turn off ${member.name}'s account? They will be signed out immediately.`)
    ) {
      return;
    }
    update.mutate({ id: member.id, changes: { active: !member.active } });
  }

  function resetPassword(member: StaffMember) {
    if (!window.confirm(`Reset ${member.name}'s password? They will be signed out everywhere.`))
      return;
    reset.mutate(member.id, { onSuccess: (password) => onPasswordReset(member.name, password) });
  }

  const error = update.error ?? reset.error;

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className={member.active ? '' : 'text-slate-500'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {member.name}
                    {member.id === me?.id && (
                      <span className="ml-2 text-xs text-slate-500">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </td>
                <td className="px-4 py-3">
                  {canManage(member) ? (
                    <Select
                      aria-label={`Role of ${member.name}`}
                      className="h-8 w-36"
                      value={member.role}
                      onChange={(event) => changeRole(member, event.target.value as Role)}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    ROLE_LABELS[member.role]
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={member.active ? 'success' : 'neutral'}>
                      {member.active ? 'Active' : 'Turned off'}
                    </Badge>
                    {member.mustChangePassword && <Badge tone="warning">Temporary password</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {canManage(member) && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => resetPassword(member)}
                        loading={reset.isPending && reset.variables === member.id}
                      >
                        Reset password
                      </Button>
                      <Button
                        variant={member.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(member)}
                        loading={update.isPending && update.variables.id === member.id}
                      >
                        {member.active ? 'Turn off' : 'Turn on'}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
