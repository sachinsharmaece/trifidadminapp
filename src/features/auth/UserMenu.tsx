import { Link } from 'react-router';
import { Button, buttonStyles } from '@/components/atoms/Button';
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
      {/* Hidden only on very narrow phones, where the header has no room for it. */}
      <span className="hidden min-[360px]:inline">
        <Link
          to="/change-password"
          className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'whitespace-nowrap' })}
        >
          Change password
        </Link>
      </span>
      {logout.isError && <span className="text-xs text-red-700">Could not sign out.</span>}
      <Button
        variant="secondary"
        size="sm"
        className="whitespace-nowrap"
        onClick={() => logout.mutate()}
        loading={logout.isPending}
      >
        Sign out
      </Button>
    </>
  );
}
