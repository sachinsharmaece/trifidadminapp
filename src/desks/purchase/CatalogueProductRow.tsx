import { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiPlus } from 'react-icons/fi';
import type { SellerCatalogueItem } from '../../api/purchase';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { listBlockedReason } from './listBlockedReason';

/**
 * One company on the seller file's "What he sells": the company name is the
 * dropdown, its products come inside it. A seller dealing in several big
 * companies carries dozens of products, so each company folds away.
 */
export function CatalogueCompanyGroup({
  name,
  items,
  defaultOpen,
  onAddToListing,
}: {
  name: string;
  items: SellerCatalogueItem[];
  defaultOpen: boolean;
  onAddToListing: (productId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `cat-company-${name.replace(/\W+/g, '-')}`;

  return (
    <div className="rounded-md border border-slate-200">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-slate-400" aria-hidden>
            {open ? <FiChevronDown /> : <FiChevronRight />}
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            {name}
          </span>
        </span>
        <span className="text-xs text-slate-500">
          {items.length} product{items.length === 1 ? '' : 's'}
        </span>
      </button>
      {open && (
        <ul id={panelId} className="flex flex-col gap-3 border-t border-slate-100 p-3">
          {items.map((item) => (
            <CatalogueProductCard
              key={item.entryId ?? `dealership-${item.productId}`}
              item={item}
              onAddToListing={() => onAddToListing(item.productId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CatalogueProductCard({
  item,
  onAddToListing,
}: {
  item: SellerCatalogueItem;
  onAddToListing: () => void;
}) {
  const blocked = listBlockedReason(item);
  return (
    <li className="rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">
          {item.brand}
          {item.productState === 'draft' && (
            <span className="ml-2">
              <Badge tone="warn">draft</Badge>
            </span>
          )}
          {item.source === 'dealership' && (
            <span className="ml-2">
              <Badge tone="neutral">via company</Badge>
            </span>
          )}
        </span>
        <Button size="sm" variant="secondary" icon={<FiPlus />} onClick={onAddToListing}>
          Add to listing
        </Button>
      </div>
      {blocked && (
        <p className="mt-1 text-right text-xs text-slate-400">Can’t be listed yet — {blocked}.</p>
      )}
      <p className="text-xs text-slate-500">{item.technical}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {item.packs.length === 0 ? (
          <span className="text-xs italic text-slate-400">No pack in the master yet.</span>
        ) : (
          <>
            <span className="mr-1 text-xs text-slate-500">
              {item.packsDetailed ? 'Packs he named:' : 'All packs:'}
            </span>
            {item.packs.map((p) => (
              <span
                key={p.skuId}
                className={`rounded border px-2 py-0.5 text-xs ${
                  p.listed
                    ? 'border-success-500 text-success-600'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                {p.packLabel}
                {p.listed ? ` · ${(p.listingRatePaise! / 100).toFixed(2)}` : ''}
              </span>
            ))}
          </>
        )}
      </div>
    </li>
  );
}
