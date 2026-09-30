import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import { createProduct, getAllManufacturers, getTechnicals } from '../../api/catalog';
import { ApiError } from '../../api/errors';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/** Manage → Products → Create. */
export function ProductCreatePage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();

  const technicalsLoader = useCallback(() => callApi((token) => getTechnicals(token)), [callApi]);
  const technicals = useAsyncData(technicalsLoader, (items) => items.length === 0, [
    technicalsLoader,
  ]);
  const manufacturersLoader = useCallback(
    () => callApi((token) => getAllManufacturers(token)),
    [callApi],
  );
  const manufacturers = useAsyncData(manufacturersLoader, (items) => items.length === 0, [
    manufacturersLoader,
  ]);

  const [brand, setBrand] = useState('');
  const [technical, setTechnical] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [hsn, setHsn] = useState('');
  const [productClass, setProductClass] = useState<'A' | 'B' | 'C'>('B');
  const [error, setError] = useState<string | null>(null);
  // B-36 — a raw single message at the bottom of the form instead of by the
  // field, the same field-level mapping already used elsewhere.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await callApi((token) =>
        createProduct(token, { brand, technical, manufacturerId, hsn, class: productClass }),
      );
      navigate(`/manage/products/${result.productId}`);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(
          submitError.fieldErrors ??
            (submitError.field ? { [submitError.field]: submitError.message } : {}),
        );
        if (!submitError.fieldErrors && !submitError.field) setError(submitError.message);
      } else {
        setError('Could not create this product.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/manage/products')}>
          Products
        </Button>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Create product</h1>
      <DevNote screen="admin_products_create" />

      <Card className="max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="p-brand"
            label="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            error={fieldErrors.brand}
            required
          />
          <div>
            <Input
              id="p-technical"
              label="Technical"
              list="technicals"
              value={technical}
              onChange={(e) => setTechnical(e.target.value)}
              error={fieldErrors.technical}
              required
            />
            {technicals.state.status === 'success' && (
              <datalist id="technicals">
                {technicals.state.data.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            )}
          </div>
          <Select
            id="p-manufacturer"
            label="Manufacturer"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
            error={fieldErrors.manufacturerId}
            required
          >
            <option value="">Select…</option>
            {manufacturers.state.status === 'success' &&
              manufacturers.state.data.map((manufacturer) => (
                <option key={manufacturer.manufacturerId} value={manufacturer.manufacturerId}>
                  {manufacturer.name}
                </option>
              ))}
          </Select>
          <Input
            id="p-hsn"
            label="HSN"
            hint="Chapter 3808, 6 or 8 digits (e.g. 380891 or 38089110). The server checks this exactly — this is just so a typo doesn't wait for the round trip to show up."
            value={hsn}
            onChange={(e) => setHsn(e.target.value)}
            error={fieldErrors.hsn}
            required
          />
          <Select
            id="p-class"
            label="Class"
            value={productClass}
            onChange={(e) => setProductClass(e.target.value as 'A' | 'B' | 'C')}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </Select>

          {error && Object.keys(fieldErrors).length === 0 && (
            <p role="alert" className="text-sm text-danger-500">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} icon={<FiPlus />}>
            Create product
          </Button>
        </form>
      </Card>
    </div>
  );
}
