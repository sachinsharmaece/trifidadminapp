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
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await callApi((token) =>
        createProduct(token, { brand, technical, manufacturerId, hsn, class: productClass }),
      );
      navigate(`/manage/products/${result.productId}`);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not create this product.',
      );
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
            required
          />
          <div>
            <Input
              id="p-technical"
              label="Technical"
              list="technicals"
              value={technical}
              onChange={(e) => setTechnical(e.target.value)}
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
            value={hsn}
            onChange={(e) => setHsn(e.target.value)}
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

          {error && (
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
