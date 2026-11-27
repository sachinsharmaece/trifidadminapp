import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { BatchesTab } from '@/features/payouts/BatchesTab';
import { ToPayTab } from '@/features/payouts/ToPayTab';

/**
 * Payouts (the Accounts desk): money going out of our bank, to sellers for the goods the dock accepted and to
 * buyers for refunds due. Accounts builds a batch and types the bank proofs; the Founder or Admin releases it
 * (never their own); the Controller only looks. A line is paid only when its UTR is typed (no proof, not paid).
 */
export function PayoutsPage() {
  const [tab, setTab] = useState<'TO_PAY' | 'BATCHES'>('TO_PAY');
  const { data: me } = useCurrentUser();
  const canWrite = me?.role !== 'CONTROLLER';
  const canRelease = me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  return (
    <PageLayout
      title="Payouts"
      description="Pay sellers for the goods the dock accepted, and give buyers their refunds back. Nothing counts as paid until the bank's UTR is typed."
    >
      <div className="flex gap-2" role="group" aria-label="Payouts view">
        <Button
          variant={tab === 'TO_PAY' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'TO_PAY'}
          onClick={() => setTab('TO_PAY')}
        >
          To pay
        </Button>
        <Button
          variant={tab === 'BATCHES' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'BATCHES'}
          onClick={() => setTab('BATCHES')}
        >
          Batches
        </Button>
      </div>
      {tab === 'TO_PAY' ? (
        <ToPayTab canBuild={canWrite} onBuilt={() => setTab('BATCHES')} />
      ) : (
        <BatchesTab canWrite={canWrite} canRelease={canRelease} />
      )}
    </PageLayout>
  );
}
