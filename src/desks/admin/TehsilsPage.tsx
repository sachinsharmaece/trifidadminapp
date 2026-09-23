import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiPlus } from 'react-icons/fi';
import { createTehsil, getTehsils } from '../../api/territory';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/** Manage → Tehsils. */
export function TehsilsPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getTehsils(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) => createTehsil(token, { name, district, state: stateName }));
      setName('');
      setDistrict('');
      setStateName('');
      retry();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not create this tehsil.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Tehsils</h1>
      <DevNote screen="admin_tehsils" />

      <Card>
        <p className="mb-4 text-sm text-slate-500">
          BR-080 — name is not a unique key; every picker disambiguates by district.
        </p>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="No tehsils yet.">
          {(items) => (
            <Table className="mb-4">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>District</Th>
                  <Th>State</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((tehsil) => (
                  <tr key={tehsil.tehsilId}>
                    <Td>{tehsil.name}</Td>
                    <Td>{tehsil.district}</Td>
                    <Td>{tehsil.state}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="District"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
          />
          <Input
            label="State"
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            required
          />
          <Button type="submit" loading={submitting} icon={<FiPlus />}>
            Add tehsil
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
