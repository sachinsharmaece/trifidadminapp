import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet } from '@/lib/refApi';
import { formatDateIST } from '@/lib/refMoney';
import { areaText, type RefSeller } from './refTypes';

/** Purchase → Sellers, as the reference (app/(purchase)/sellers). A row opens the seller. */
export function SellersPage() {
  useDocumentTitle('Sellers');
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<RefSeller[]>([]);

  useOnMount(async () => {
    const data = await refGet<{ sellers: RefSeller[] }>('/sellers', { pageSize: 100 });
    setSellers(data.sellers ?? []);
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Sellers</h1>
        <Link
          to="/sellers/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Register seller
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-2">Name</th>
            <th className="py-2">Area</th>
            <th className="py-2">Mobile</th>
            <th className="py-2">Dispatch cut-off</th>
            <th className="py-2">Registered</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((s) => (
            <tr
              key={s.id}
              onClick={() => void navigate(`/sellers/${s.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void navigate(`/sellers/${s.id}`);
              }}
              className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 active:bg-zinc-100"
            >
              <td className="py-3">{s.firmName}</td>
              <td className="py-3">{areaText(s.tehsil)}</td>
              <td className="py-3">{s.mobile}</td>
              <td className="py-3">{s.dispatchCutoff}</td>
              <td className="py-3">{formatDateIST(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
