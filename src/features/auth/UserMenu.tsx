import { Button } from '@/components/atoms/Button';
import { ROLE_LABELS } from '@/types/roles';
import { useCurrentUser, useLogout } from './hooks';

/** Right side of the header: who is signed in, and the Sign out button. */
export function UserMenu() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="hidden text-right text-sm leading-tight sm:block">
        <p className="font-medium text-slate-900">{user.name}</p>
        <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
      </div>
      {logout.isError && <span className="text-xs text-red-700">Could not sign out.</span>}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => logout.mutate()}
        loading={logout.isPending}
      >
        Sign out
      </Button>
    </>
  );
}
