import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { AddStaffForm } from '@/features/staff/AddStaffForm';
import { useStaff } from '@/features/staff/hooks';
import { StaffTable } from '@/features/staff/StaffTable';
import { TemporaryPasswordNotice } from '@/features/staff/TemporaryPasswordNotice';

/** Staff accounts: who can sign in, with which role. Founder and Admin only (the API enforces it). */
export function StaffPage() {
  const staff = useStaff();
  const [adding, setAdding] = useState(false);
  // Set right after an account is created or a password is reset; cleared when dismissed.
  const [notice, setNotice] = useState<{ name: string; password: string } | null>(null);

  function showPassword(name: string, password: string) {
    setAdding(false);
    setNotice({ name, password });
  }

  return (
    <PageLayout
      title="Staff"
      description="People who can sign in to TriFid, and what each role may do."
      actions={!adding && <Button onClick={() => setAdding(true)}>Add staff</Button>}
    >
      {notice && (
        <TemporaryPasswordNotice
          name={notice.name}
          password={notice.password}
          onDismiss={() => setNotice(null)}
        />
      )}

      {adding && <AddStaffForm onCreated={showPassword} onCancel={() => setAdding(false)} />}

      {staff.isPending && <Spinner label="Loading staff" className="h-6 w-6 text-brand-600" />}
      {staff.isError && (
        <ErrorState title="Could not load staff" message={staff.error.message}>
          <Button onClick={() => void staff.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {staff.isSuccess && <StaffTable members={staff.data} onPasswordReset={showPassword} />}
    </PageLayout>
  );
}
