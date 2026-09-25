import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiPlus } from 'react-icons/fi';
import { createManufacturer, getAllManufacturers, updateManufacturer } from '../../api/catalog';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

/** Manage → Manufacturers. */
export function ManufacturersPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getAllManufacturers(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) => createManufacturer(token, name));
      setName('');
      retry();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not create this manufacturer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Manufacturers</h1>
      <DevNote screen="admin_manufacturers" />

      <Card>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="No manufacturers yet.">
          {(items) => (
            <ul className="mb-4 flex flex-wrap gap-2">
              {items.map((manufacturer) => (
                <li key={manufacturer.manufacturerId} className="flex items-center gap-1">
                  <Badge>{manufacturer.name}</Badge>
                  {manufacturer.state === 'draft' && (
                    <>
                      <Badge tone="warn">draft</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void callApi((token) =>
                            updateManufacturer(token, manufacturer.manufacturerId, {
                              state: 'live',
                            }),
                          ).then(retry)
                        }
                      >
                        Confirm
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AsyncBoundary>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Button type="submit" loading={submitting} icon={<FiPlus />}>
            Add manufacturer
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger-500">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
