import { useEffect, useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface CompanyForm {
  name: string;
  gstin: string;
  address: string;
  bankAccountNumber: string;
  ifsc: string;
}

const EMPTY: CompanyForm = { name: '', gstin: '', address: '', bankAccountNumber: '', ifsc: '' };
const LABELS: Record<keyof CompanyForm, string> = {
  name: 'name',
  gstin: 'GSTIN',
  address: 'address',
  bankAccountNumber: 'bank Account Number',
  ifsc: 'IFSC',
};

interface CompanyResponse {
  company: {
    name: string;
    gstin: string;
    address: string;
    bank: { accountLast4: string | null; ifsc: string; bankName: string };
  } | null;
}

/**
 * Masters → Company, as the reference (app/(admin)/masters/company). One difference: the bank account number is kept
 * locked on the server and never comes back, so its box starts empty with the last 4 digits shown; leave it empty
 * to keep the saved number.
 */
export function CompanyPage() {
  useDocumentTitle('Company');
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [last4, setLast4] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refGet<CompanyResponse>('/company').then((data) => {
      if (!data.company) return;
      setForm({
        name: data.company.name,
        gstin: data.company.gstin,
        address: data.company.address,
        bankAccountNumber: '',
        ifsc: data.company.bank.ifsc,
      });
      setLast4(data.company.bank.accountLast4);
      setBankName(data.company.bank.bankName);
    });
  }, []);

  function set<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await refSend('PUT', '/company', {
        name: form.name,
        gstin: form.gstin,
        address: form.address,
        bank: {
          ...(form.bankAccountNumber ? { accountNumber: form.bankAccountNumber } : {}),
          ifsc: form.ifsc,
          bankName,
        },
      });
      if (!res.ok) {
        setFieldErrors({
          [res.field === 'bank' ? 'bankAccountNumber' : (res.field ?? '_form')]: res.message,
        });
        return;
      }
      if (form.bankAccountNumber) setLast4(form.bankAccountNumber.slice(-4));
      set('bankAccountNumber', '');
      setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Company</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        {(['name', 'gstin', 'address', 'bankAccountNumber', 'ifsc'] as const).map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <label htmlFor={`company-${key}`} className="text-sm capitalize text-zinc-700">
              {LABELS[key]}
            </label>
            <input
              id={`company-${key}`}
              name={key}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              required={key !== 'bankAccountNumber' || last4 === null}
              placeholder={
                key === 'bankAccountNumber' && last4
                  ? `Saved, ends ${last4} (leave empty to keep)`
                  : ''
              }
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            {fieldErrors[key] && <p className="text-xs text-red-600">{fieldErrors[key]}</p>}
          </div>
        ))}
        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}
        {saved && <p className="text-xs text-green-700">Saved.</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </div>
  );
}
