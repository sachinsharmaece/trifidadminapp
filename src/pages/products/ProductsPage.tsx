import { useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonStyles } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import { useProducts } from '@/features/products/hooks';
import { ProductsTable } from '@/features/products/ProductsTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const PAGE_SIZE = 25;

/** Every product with its packs. The server does the searching and paging, so the list can grow. */
export function ProductsPage() {
  const canEdit = useCanEditMasters();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Wait until typing pauses before asking the server.
  const q = useDebouncedValue(search.trim());
  const products = useProducts({ q, page, pageSize: PAGE_SIZE });

  function changeSearch(text: string) {
    setSearch(text);
    setPage(1); // a new search starts from the first page
  }

  return (
    <PageLayout
      title="Products"
      description="What we trade, and the packs each product comes in."
      actions={
        canEdit && (
          <Link to="/products/new" className={buttonStyles()}>
            Add product
          </Link>
        )
      }
    >
      <DataTableToolbar
        searchValue={search}
        onSearchChange={changeSearch}
        searchPlaceholder="Search products"
      />

      {products.isPending && (
        <Spinner label="Loading products" className="h-6 w-6 text-brand-600" />
      )}
      {products.isError && (
        <ErrorState title="Could not load products" message={products.error.message}>
          <Button onClick={() => void products.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {products.isSuccess && (
        <>
          <ProductsTable products={products.data.products} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={products.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
