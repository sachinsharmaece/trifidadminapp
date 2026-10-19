import { useCallback, useEffect, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { getSkusForProduct, searchProducts } from '../../api/catalog';
import type { SkuDto } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { Button, Input, SearchSelect, Select } from '../../components/ui';
import type { SearchSelectOption } from '../../components/ui';

/**
 * One product on a "Log a buyer call" form, as a single horizontal row:
 * product (searchable) · pack · quantity · expected rate · remove.
 *
 * It owns the product/pack choice (like `PackPicker` does) and reports only the chosen pack's
 * id; quantity and expected rate are controlled by the form. On a narrow screen the row wraps.
 */
export function CallLineFields({
  index,
  qty,
  expectedRate,
  error,
  onSkuChange,
  onQtyChange,
  onExpectedRateChange,
  onRemove,
}: {
  index: number;
  qty: number;
  /** Rupees as typed; empty means no expected rate was mentioned. */
  expectedRate: string;
  error?: string;
  onSkuChange: (skuId: string) => void;
  onQtyChange: (qty: number) => void;
  onExpectedRateChange: (rupees: string) => void;
  /** Absent when this is the only line — a call needs at least one product. */
  onRemove?: () => void;
}) {
  const { callApi } = useAuth();
  const [options, setOptions] = useState<SearchSelectOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [productId, setProductId] = useState('');
  const [productLabel, setProductLabel] = useState('');
  const [skus, setSkus] = useState<SkuDto[]>([]);
  const [skuId, setSkuId] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const latestQuery = useRef('');

  const search = useCallback(
    (query: string) => {
      latestQuery.current = query;
      window.clearTimeout(timer.current);
      setSearching(true);
      timer.current = window.setTimeout(() => {
        void callApi((token) => searchProducts(token, query))
          .then((rows) => {
            // A slower, older reply must not overwrite the answer to what is typed now.
            if (latestQuery.current !== query) return;
            setOptions(
              rows.map((p) => ({ value: p.productId, label: p.brand, detail: p.technical })),
            );
          })
          .catch(() => {
            if (latestQuery.current === query) setOptions([]);
          })
          .finally(() => {
            if (latestQuery.current === query) setSearching(false);
          });
      }, 200);
    },
    [callApi],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pickProduct(id: string, option: SearchSelectOption): void {
    setProductId(id);
    setProductLabel(option.detail ? `${option.label} — ${option.detail}` : option.label);
    setSkuId('');
    onSkuChange('');
    setSkus([]);
    void callApi((token) => getSkusForProduct(token, id))
      .then((rows) => {
        setSkus(rows);
        // A product with one pack needs no choosing.
        if (rows.length === 1) {
          setSkuId(rows[0]!.skuId);
          onSkuChange(rows[0]!.skuId);
        }
      })
      .catch(() => setSkus([]));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid items-end gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_6rem_9rem_auto]">
        <SearchSelect
          label={`Product${index === 0 ? '' : ` ${index + 1}`}`}
          required
          options={options}
          value={productId}
          selectedLabel={productLabel}
          loading={searching}
          onSearch={search}
          onChange={pickProduct}
        />
        <Select
          label="Pack"
          required
          value={skuId}
          disabled={!productId}
          onChange={(e) => {
            setSkuId(e.target.value);
            onSkuChange(e.target.value);
          }}
        >
          <option value="">Choose…</option>
          {skus.map((s) => (
            <option key={s.skuId} value={s.skuId}>
              {s.packLabel} · {s.unitsPerBox} per box
            </option>
          ))}
        </Select>
        <Input
          label="Qty (boxes)"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => onQtyChange(Number(e.target.value))}
          required
        />
        <Input
          label="Expected rate (₹)"
          type="number"
          min={0}
          step="0.01"
          placeholder="optional"
          value={expectedRate}
          onChange={(e) => onExpectedRateChange(e.target.value)}
        />
        <div className="md:pb-0.5">
          {onRemove ? (
            <Button type="button" size="sm" variant="ghost" icon={<FiX />} onClick={onRemove}>
              Remove
            </Button>
          ) : (
            <span className="block w-0 md:w-16" aria-hidden />
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          Not logged: {error}
        </p>
      )}
    </div>
  );
}
