import { maskedAccount } from '@/utils/format';
import type { Company } from './api';

/** The read-only view for people who may look but not change (everyone except Founder and Admin). */
export function CompanySummary({ company }: { company: Company | null }) {
  if (!company) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        The company profile has not been set up yet. The Founder or an Admin can add it.
      </p>
    );
  }

  const details: [label: string, value: string][] = [
    ['Company name', company.name],
    ['GSTIN', company.gstin],
    ['State code', company.stateCode],
    ['Address', company.address],
    ['Bank', company.bank.bankName || '—'],
    ['Account number', company.bank.accountLast4 ? maskedAccount(company.bank.accountLast4) : '—'],
    ['IFSC code', company.bank.ifsc || '—'],
  ];

  return (
    <dl className="grid gap-x-6 gap-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm sm:grid-cols-2">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs uppercase text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
