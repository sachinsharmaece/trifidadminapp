import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createHsn,
  createManufacturer,
  createTechnical,
  getAllManufacturers,
  getHsnMasters,
  getTechnicalMasters,
} from '../../api/catalog';
import type { PackUnit } from '../../api/catalog';
import { ApiError } from '../../api/errors';
import type { HsnDto, ManufacturerDto, ProductCategory, TechnicalDto } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { useAsyncData } from '../../lib/useAsyncData';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SearchSelect } from '../../components/ui/SearchSelect';
import type { SearchSelectOption } from '../../components/ui/SearchSelect';

export const CATEGORY_OPTIONS: Array<{ value: ProductCategory; label: string }> = [
  { value: 'seed', label: 'Seed' },
  { value: 'pesticide', label: 'Pesticide' },
  { value: 'fertilizer', label: 'Fertilizer' },
];

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  seed: 'Seed',
  pesticide: 'Pesticide',
  fertilizer: 'Fertilizer',
};

export const PACK_UNIT_OPTIONS: Array<{ value: PackUnit; label: string }> = [
  { value: 'LTR', label: 'Litre (LTR)' },
  { value: 'ML', label: 'Millilitre (ML)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'GM', label: 'Gram (GM)' },
  { value: 'PC', label: 'Piece (PC)' },
];

/** The three masters the product form picks from, each with a reload after "add new". */
export function useProductMasters(): {
  technicals: TechnicalDto[];
  manufacturers: ManufacturerDto[];
  hsns: HsnDto[];
  reloadTechnicals: () => void;
  reloadManufacturers: () => void;
  reloadHsns: () => void;
} {
  const { callApi } = useAuth();
  const technicalsLoader = useCallback(() => callApi((t) => getTechnicalMasters(t)), [callApi]);
  const manufacturersLoader = useCallback(() => callApi((t) => getAllManufacturers(t)), [callApi]);
  const hsnLoader = useCallback(() => callApi((t) => getHsnMasters(t)), [callApi]);
  const technicals = useAsyncData(technicalsLoader, () => false, [technicalsLoader]);
  const manufacturers = useAsyncData(manufacturersLoader, () => false, [manufacturersLoader]);
  const hsns = useAsyncData(hsnLoader, () => false, [hsnLoader]);
  return {
    technicals: technicals.state.status === 'success' ? technicals.state.data : [],
    manufacturers: manufacturers.state.status === 'success' ? manufacturers.state.data : [],
    hsns: hsns.state.status === 'success' ? hsns.state.data : [],
    reloadTechnicals: technicals.retry,
    reloadManufacturers: manufacturers.retry,
    reloadHsns: hsns.retry,
  };
}

const ADD_NEW = '__add_new__';

/**
 * A searchable dropdown over a master list. The list is already loaded, so
 * typing filters it locally; the last row is always "Add new …" so a missing
 * technical/manufacturer/HSN never blocks the form.
 */
export function MasterPicker({
  label,
  required,
  options,
  value,
  selectedLabel,
  addLabel,
  onPick,
  onAddNew,
}: {
  label: string;
  required?: boolean;
  options: SearchSelectOption[];
  value: string;
  selectedLabel: string;
  addLabel: string;
  onPick: (value: string, option: SearchSelectOption) => void;
  /** Called with whatever was typed in the box, to prefill the add form. */
  onAddNew: (typed: string) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = term
      ? options.filter((o) => `${o.label} ${o.detail ?? ''}`.toLowerCase().includes(term))
      : options;
    return [
      ...matches.slice(0, 50),
      { value: ADD_NEW, label: `+ ${addLabel}${query.trim() ? ` “${query.trim()}”` : ''}` },
    ];
  }, [options, query, addLabel]);

  return (
    <SearchSelect
      label={label}
      required={required}
      options={shown}
      value={value}
      selectedLabel={selectedLabel}
      onSearch={setQuery}
      onChange={(picked, option) => {
        if (picked === ADD_NEW) onAddNew(query.trim());
        else onPick(picked, option);
      }}
    />
  );
}

function fieldMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** One-field "add" modal shared by technical and manufacturer. */
function AddNameModal({
  open,
  title,
  fieldLabel,
  initial,
  save,
  onClose,
  onSaved,
}: {
  open: boolean;
  title: string;
  fieldLabel: string;
  initial: string;
  save: (name: string) => Promise<string>;
  onClose: () => void;
  onSaved: (id: string, name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation(); // This form sits inside a portal but React still bubbles to the product form.
    setError(null);
    setSubmitting(true);
    try {
      const id = await save(name.trim());
      onSaved(id, name.trim());
    } catch (submitError) {
      setError(fieldMessage(submitError, `Could not add this ${fieldLabel.toLowerCase()}.`));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={fieldLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          required
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="submit" loading={submitting} disabled={!name.trim()}>
            Add
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AddTechnicalModal(props: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const { callApi } = useAuth();
  return (
    <AddNameModal
      key={`${props.open}-${props.initial}`}
      open={props.open}
      title="Add technical"
      fieldLabel="Technical"
      initial={props.initial}
      save={async (name) => (await callApi((t) => createTechnical(t, name))).technicalId}
      onClose={props.onClose}
      onSaved={(_id, name) => props.onSaved(name)}
    />
  );
}

export function AddManufacturerModal(props: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSaved: (manufacturerId: string, name: string) => void;
}) {
  const { callApi } = useAuth();
  return (
    <AddNameModal
      key={`${props.open}-${props.initial}`}
      open={props.open}
      title="Add manufacturer"
      fieldLabel="Manufacturer"
      initial={props.initial}
      save={async (name) => (await callApi((t) => createManufacturer(t, name))).manufacturerId}
      onClose={props.onClose}
      onSaved={props.onSaved}
    />
  );
}

export function AddHsnModal(props: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSaved: (hsn: { code: string; taxPercent: number }) => void;
}) {
  const { callApi } = useAuth();
  const [code, setCode] = useState(/^\d+$/.test(props.initial) ? props.initial : '');
  const [description, setDescription] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    setErrors({});
    setSubmitting(true);
    try {
      await callApi((t) =>
        createHsn(t, {
          code: code.trim(),
          description: description.trim() || undefined,
          taxPercent: Number(taxPercent),
        }),
      );
      props.onSaved({ code: code.trim(), taxPercent: Number(taxPercent) });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setErrors(
          submitError.fieldErrors ?? { [submitError.field ?? 'code']: submitError.message },
        );
      } else {
        setErrors({ code: 'Could not add this HSN.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={props.open} title="Add HSN" onClose={props.onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="HSN code"
          hint="6 or 8 digits."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          error={errors.code}
          required
          autoFocus
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />
        <Input
          label="Tax %"
          type="number"
          min={0}
          max={100}
          step="any"
          value={taxPercent}
          onChange={(e) => setTaxPercent(e.target.value)}
          error={errors.taxPercent}
          required
        />
        <div className="flex gap-2">
          <Button type="submit" loading={submitting} disabled={!code.trim() || taxPercent === ''}>
            Add
          </Button>
          <Button type="button" variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
