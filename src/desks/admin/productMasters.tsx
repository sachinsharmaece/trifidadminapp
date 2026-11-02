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
import { useFormSubmit } from '../../lib/useFormSubmit';
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
  save: (name: string, idempotencyKey: string) => Promise<string>;
  onClose: () => void;
  onSaved: (id: string, name: string) => void;
}) {
  const [name, setName] = useState(initial);
  // The form kit: one Idempotency-Key per attempt, a double click ignored.
  const form = useFormSubmit<string>({
    fields: ['name'],
    success: `${fieldLabel} added.`,
    toastOnSuccess: true,
    fallbackError: `Could not add this ${fieldLabel.toLowerCase()}.`,
    onSuccess: (id) => onSaved(id, name.trim()),
  });
  const error = form.fieldErrors.name ?? form.formError;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    event.stopPropagation(); // This form sits inside a portal but React still bubbles to the product form.
    void form.submit((key) => save(name.trim(), key));
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
          <Button type="submit" loading={form.submitting} disabled={!name.trim()}>
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
      save={async (name, key) => (await callApi((t) => createTechnical(t, name, key))).technicalId}
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
      save={async (name, key) =>
        (await callApi((t) => createManufacturer(t, name, key))).manufacturerId
      }
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
  const form = useFormSubmit<unknown>({
    fields: ['code', 'description', 'taxPercent'],
    success: 'HSN added.',
    toastOnSuccess: true,
    fallbackError: 'Could not add this HSN.',
    onSuccess: () => props.onSaved({ code: code.trim(), taxPercent: Number(taxPercent) }),
  });
  const errors = form.fieldErrors;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void form.submit((key) =>
      callApi((t) =>
        createHsn(
          t,
          {
            code: code.trim(),
            description: description.trim() || undefined,
            taxPercent: Number(taxPercent),
          },
          key,
        ),
      ),
    );
  }

  return (
    <Modal open={props.open} title="Add HSN" onClose={props.onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="HSN code"
          hint="6 or 8 digits."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          error={errors.code ?? form.formError ?? undefined}
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
          <Button
            type="submit"
            loading={form.submitting}
            disabled={!code.trim() || taxPercent === ''}
          >
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
