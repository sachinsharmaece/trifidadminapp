import { useState } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import { putSellerDealerships, type SellerDealershipItem } from '../../api/purchase';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CompanyPicker } from './CompanyPicker';

/**
 * The companies a seller deals in. Saved as a whole: every product of a
 * ticked company appears under "What he sells" and counts as carried.
 */
export function SellerDealershipsCard({
  sellerId,
  dealerships,
  onSaved,
}: {
  sellerId: string;
  dealerships: SellerDealershipItem[];
  onSaved: () => void;
}) {
  const { callApi } = useAuth();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing(): void {
    setSelected(dealerships.map((d) => d.manufacturerId));
    setError(null);
    setEditing(true);
  }

  async function save(): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      await callApi((token) => putSellerDealerships(token, sellerId, selected));
      setEditing(false);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'Could not save the companies.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Companies"
      actions={
        !editing && (
          <Button size="sm" variant="secondary" icon={<FiEdit2 />} onClick={startEditing}>
            Edit
          </Button>
        )
      }
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <CompanyPicker value={selected} onChange={setSelected} disabled={saving} />
          {error && (
            <p role="alert" className="text-sm text-danger-500">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={() => void save()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : dealerships.length === 0 ? (
        <p className="text-sm text-slate-500">
          No company ticked. Tick the companies he is a dealer or distributor for.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {dealerships.map((d) => (
            <li key={d.manufacturerId} className="flex items-center justify-between gap-2">
              <span>
                {d.name}
                {d.state === 'draft' ? ' (draft)' : ''}
              </span>
              <span className="text-xs text-slate-500">
                {d.productCount} product{d.productCount === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
