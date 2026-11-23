import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { FormField } from '@/components/molecules/FormField';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { BoardTable } from '@/features/board/BoardTable';
import { useBoard } from '@/features/board/hooks';
import { BuyerPicker, type BuyerChoice } from '@/features/buyers/BuyerPicker';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { RATE_TIER_LABELS } from '@/types/party';

const PAGE_SIZE = 25;

/** The Sales price list: pick a buyer to see every offer we can quote him today, at his rate. */
export function RateBoardPage() {
  const [buyer, setBuyer] = useState<BuyerChoice | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Wait until typing pauses before asking the server.
  const q = useDebouncedValue(search.trim());
  const board = useBoard(buyer?.id ?? null, { q, page, pageSize: PAGE_SIZE });

  function chooseBuyer(chosen: BuyerChoice) {
    setBuyer(chosen);
    setSearch('');
    setPage(1);
  }

  function changeSearch(text: string) {
    setSearch(text);
    setPage(1); // a new search starts from the first page
  }

  return (
    <PageLayout title="Rate board" description="What we can offer a buyer today, and at what rate.">
      <FormField label="Buyer" className="max-w-md">
        {(field) => <BuyerPicker field={field} value={buyer} onChange={chooseBuyer} />}
      </FormField>

      {buyer && board.isPending && (
        <Spinner label="Loading the rate board" className="h-6 w-6 text-brand-600" />
      )}
      {buyer && board.isError && (
        <ErrorState title="Could not load the rate board" message={board.error.message}>
          <Button onClick={() => void board.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {buyer && board.isSuccess && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">{board.data.buyer.firmName}</span>
            <span>priced as {RATE_TIER_LABELS[board.data.buyer.tier]}</span>
            {board.data.buyer.indicative && <Badge tone="warning">Indicative</Badge>}
          </div>
          {board.data.buyer.indicative && (
            <p className="text-xs text-slate-500">
              This buyer is not classified yet, so he is priced as a Retailer and the rates may
              change. Use Classify now on the Buyers page to confirm his tier.
            </p>
          )}

          <DataTableToolbar
            searchValue={search}
            onSearchChange={changeSearch}
            searchPlaceholder="Search by product"
            searchLabel="Search the rate board"
          />
          <BoardTable rows={board.data.rows} indicative={board.data.buyer.indicative} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={board.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
