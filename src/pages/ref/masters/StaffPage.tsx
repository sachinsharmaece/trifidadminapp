import { useState } from 'react';
import { NamePicker, type NamePickerOption } from '@/components/ref/NamePicker';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  reportsTo: { id: string; name: string } | null;
  receivingLeads: boolean;
}

interface Tehsil {
  id: string;
  name: string;
  district: string;
  state: string;
}

const ROLES = [
  'SALES',
  'PURCHASE',
  'ACCOUNTS',
  'LOGISTICS',
  'ADMIN',
  'CONTROLLER',
  'FOUNDER',
] as const;

/** The ladder for each department, as the reference hard-codes it. */
const POSITIONS_BY_ROLE: Record<string, { value: string; label: string }[]> = {
  SALES: [
    { value: 'JR_SALES_EXECUTIVE', label: 'Jr Sales Executive' },
    { value: 'SR_SALES_EXECUTIVE', label: 'Sr. Sales Executive' },
    { value: 'TM', label: 'TM' },
  ],
  PURCHASE: [
    { value: 'JR_PURCHASE_EXECUTIVE', label: 'Jr Purchase Executive' },
    { value: 'SR_PURCHASE_EXECUTIVE', label: 'Sr. Purchase Executive' },
    { value: 'TM_PURCHASE', label: 'TM Purchase' },
  ],
  ACCOUNTS: [
    { value: 'JR_ACCOUNTANT', label: 'Jr Accountant' },
    { value: 'ACCOUNTANT', label: 'Accountant' },
  ],
  LOGISTICS: [
    { value: 'FIELD_EXECUTIVE', label: 'Field Executive' },
    { value: 'LOGISTICS_HEAD', label: 'Logistics Head' },
  ],
};

const fieldClass = 'min-h-11 rounded border border-zinc-300 px-3 py-2 text-base sm:text-sm';

/** Masters → Staff, as the reference (app/(admin)/masters/staff). */
export function StaffPage() {
  useDocumentTitle('Staff');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tehsils, setTehsils] = useState<Tehsil[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('SALES');
  const [position, setPosition] = useState('');
  const [reportsToId, setReportsToId] = useState<string | undefined>(undefined);
  const [workingAreaId, setWorkingAreaId] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    const [staffRes, tehsilRes] = await Promise.all([
      refGet<{ users: Staff[] }>('/users'),
      refGet<{ tehsils: Tehsil[] }>('/tehsils', { pageSize: 100 }),
    ]);
    setStaff(staffRes.users ?? []);
    setTehsils(tehsilRes.tehsils ?? []);
  }

  useOnMount(load);

  const positionOptions = POSITIONS_BY_ROLE[role] ?? [];
  const managerOptions: NamePickerOption[] = staff
    .filter((s) => s.position && positionOptions.some((p) => p.value === s.position))
    .map((s) => ({ id: s.id, label: s.name, sublabel: s.position ?? undefined }));

  function resetForm() {
    setName('');
    setEmail('');
    setPosition('');
    setReportsToId(undefined);
    setWorkingAreaId('');
    setPassword('');
  }

  async function toggleReceivingLeads(staffId: string, on: boolean) {
    await refSend('PATCH', `/users/${staffId}/receiving-leads`, { on });
    await load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await refSend('POST', '/users', {
        name,
        email,
        role,
        position: position || undefined,
        reportsToId: reportsToId || undefined,
        workingAreaId: workingAreaId || undefined,
        password,
      });
      if (!res.ok) {
        setFieldErrors({ [res.field ?? '_form']: res.message });
        return;
      }
      resetForm();
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Staff</h1>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mb-8 flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={fieldClass}
          />
          {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={fieldClass}
          />
          {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Role
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPosition('');
              setReportsToId(undefined);
            }}
            className={fieldClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {positionOptions.length > 0 && (
          <>
            <label className="flex flex-col gap-1 text-sm text-zinc-700">
              Position
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select…</option>
                {positionOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {fieldErrors.position && (
                <p className="text-xs text-red-600">{fieldErrors.position}</p>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-700">
              Reports to (same department, a more senior tier)
              <NamePicker
                ariaLabel="Reports to"
                options={managerOptions}
                value={reportsToId}
                onChange={setReportsToId}
                placeholder="Search staff by name…"
              />
              {fieldErrors.reportsToId && (
                <p className="text-xs text-red-600">{fieldErrors.reportsToId}</p>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-700">
              Working area (optional)
              <select
                value={workingAreaId}
                onChange={(e) => setWorkingAreaId(e.target.value)}
                className={fieldClass}
              >
                <option value="">None</option>
                {tehsils.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.district}, {t.state}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Initial password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className={fieldClass}
          />
          {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
          <span className="text-xs text-zinc-400">
            The staff member will be asked to change this on first login.
          </span>
        </label>
        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
        >
          Create staff account
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="py-2">Name</th>
            <th className="py-2">Role</th>
            <th className="py-2">Position</th>
            <th className="py-2">Reports to</th>
            <th className="py-2">Receiving leads</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className="border-b border-zinc-100">
              <td className="py-2">{s.name}</td>
              <td className="py-2">{s.role}</td>
              <td className="py-2">{s.position ?? '—'}</td>
              <td className="py-2">{s.reportsTo?.name ?? '—'}</td>
              <td className="py-2">
                {s.role === 'SALES' ? (
                  <input
                    type="checkbox"
                    aria-label={`Receiving leads for ${s.name}`}
                    checked={s.receivingLeads}
                    onChange={(e) => void toggleReceivingLeads(s.id, e.target.checked)}
                    className="h-5 w-5"
                  />
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
