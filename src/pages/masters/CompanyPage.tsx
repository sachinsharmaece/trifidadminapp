import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import { CompanyForm } from '@/features/company/CompanyForm';
import { CompanySummary } from '@/features/company/CompanySummary';
import { useCompany } from '@/features/company/hooks';

/** TriFid's own legal and bank details. There is only one: it is created the first time it is saved. */
export function CompanyPage() {
  const company = useCompany();
  const canEdit = useCanEditMasters();

  return (
    <PageLayout
      title="Company profile"
      description="TriFid's own legal and bank details, used on order documents."
    >
      {company.isPending && (
        <Spinner label="Loading company profile" className="h-6 w-6 text-brand-600" />
      )}
      {company.isError && (
        <ErrorState title="Could not load the company profile" message={company.error.message}>
          <Button onClick={() => void company.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {company.isSuccess &&
        (canEdit ? (
          <CompanyForm company={company.data} />
        ) : (
          <CompanySummary company={company.data} />
        ))}
    </PageLayout>
  );
}
