import { Link } from 'react-router';
import { buttonStyles } from '@/components/atoms/Button';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';

export function NotFoundPage() {
  return (
    <PageLayout title="Page not found">
      <ErrorState
        title="We can't find that page"
        message="The address may be wrong, or the page may have moved."
      >
        <Link to="/" className={buttonStyles({ variant: 'secondary' })}>
          Back to dashboard
        </Link>
      </ErrorState>
    </PageLayout>
  );
}
