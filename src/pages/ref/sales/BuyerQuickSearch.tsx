import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { NamePicker, type NamePickerOption } from '@/components/ref/NamePicker';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet } from '@/lib/refApi';
import { tehsilText, type RefBuyer } from './salesTypes';

/**
 * The buyer search above every Sales-desk screen, as the reference (components/sales/BuyerQuickSearch.tsx and
 * app/(sales)/layout.tsx): picking a buyer opens the Call screen for him.
 */
export function SalesDeskLayout() {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<RefBuyer[]>([]);

  useOnMount(async () => {
    const data = await refGet<{ buyers: RefBuyer[] }>('/buyers', { pageSize: 100, active: 'true' });
    setBuyers(data.buyers ?? []);
  });

  const options: NamePickerOption[] = buyers.map((b) => ({
    id: b.id,
    label: b.firmName,
    sublabel: tehsilText(b.tehsil),
  }));

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <NamePicker
            ariaLabel="Search a buyer to take a call"
            options={options}
            value={undefined}
            onChange={(id) => {
              if (id) void navigate(`/call-screen?buyerId=${id}`);
            }}
            placeholder="Search a buyer to take a call…"
          />
        </div>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
