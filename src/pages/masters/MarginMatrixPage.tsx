import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import { useMarginCells } from '@/features/margins/hooks';
import { MarginForm } from '@/features/margins/MarginForm';
import { MarginGrid } from '@/features/margins/MarginGrid';
import { MarginHistory } from '@/features/margins/MarginHistory';
import type { BuyerTier } from '@/types/margin';
import type { SkuClass } from '@/types/product';

/** What the form starts with: nothing chosen yet, or the class and tier of a clicked box. */
interface FormStart {
  skuClass?: SkuClass;
  buyerTier?: BuyerTier;
}

/**
 * TriFid's margin on top of the landed rate, for every pack class and buyer tier. Controller, Founder and Admin
 * may look; Founder and Admin may change it. A change adds a new line, it never overwrites one.
 */
export function MarginMatrixPage() {
  const cells = useMarginCells();
  const canEdit = useCanEditMasters();
  // null = no form; an object = the form is open (with this class and tier chosen, if any).
  const [form, setForm] = useState<FormStart | null>(null);

  return (
    <PageLayout
      title="Margin matrix"
      description="TriFid's margin on top of the landed rate, by pack class and buyer tier."
      actions={
        canEdit && form === null && <Button onClick={() => setForm({})}>Change a margin</Button>
      }
    >
      {cells.isPending && <Spinner label="Loading margins" className="h-6 w-6 text-brand-600" />}
      {cells.isError && (
        <ErrorState title="Could not load the margin matrix" message={cells.error.message}>
          <Button onClick={() => void cells.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {cells.isSuccess && (
        <>
          {form !== null && (
            <MarginForm
              // A new key resets the form when another box is clicked.
              key={`${form.skuClass ?? ''}/${form.buyerTier ?? ''}`}
              cells={cells.data}
              skuClass={form.skuClass}
              buyerTier={form.buyerTier}
              onDone={() => setForm(null)}
            />
          )}
          <MarginGrid
            cells={cells.data}
            canEdit={canEdit}
            onChange={(skuClass, buyerTier) => setForm({ skuClass, buyerTier })}
          />
          <section className="space-y-3">
            <h2 className="text-base font-semibold">All changes</h2>
            <MarginHistory cells={cells.data} />
          </section>
        </>
      )}
    </PageLayout>
  );
}
