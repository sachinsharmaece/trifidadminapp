import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiDatabase,
  FiUserCheck,
  // FiGitBranch, FiInbox — only used by the commented-out Enquiries/Trade
  // chain nav items below; restore this import alongside them.
  FiDollarSign,
  FiFileText,
  FiTruck,
  FiBarChart2,
  FiShoppingCart,
  FiTrendingUp,
  FiPackage,
  FiSliders,
  FiBell,
  FiEye,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronDown,
  FiChevronRight,
  FiPhoneCall,
} from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { listSalesBuyers, type BuyerListRow } from '../api/sales';
import { PERMISSIONS } from '../lib/permissions';
import { ToastProvider } from './ui/Toast';

interface NavChild {
  to: string;
  label: string;
}

interface NavItem {
  to?: string;
  label: string;
  icon: ReactNode;
  // Several strings means "any one of them".
  permission: string | string[];
  // A group with no `to` of its own — expands to show its children instead
  // of navigating (e.g. Manage → Products / Manufacturers / Tehsils).
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Team', icon: <FiUsers />, permission: PERMISSIONS.EMPLOYEE_READ },
  {
    label: 'Manage',
    icon: <FiDatabase />,
    permission: PERMISSIONS.CATALOG_WRITE,
    children: [
      { to: '/manage/products', label: 'Products' },
      { to: '/manage/manufacturers', label: 'Manufacturers' },
      { to: '/manage/tehsils', label: 'Tehsils' },
    ],
  },
  {
    to: '/registrations',
    label: 'Registrations',
    icon: <FiUserCheck />,
    permission: PERMISSIONS.ONBOARDING_READ,
  },
  // 2026-10-02 — pivoting away from Enquiry and Trade chain for now (see
  // ENQUIRY_FLOW_ENABLED/CHAIN_STAGE_TRACKING_ENABLED, trifidserverapp's
  // config/env.ts). Uncomment to restore; the matching routes in App.tsx are
  // commented out the same way.
  // {
  //   to: '/enquiries',
  //   label: 'Enquiries',
  //   icon: <FiInbox />,
  //   permission: PERMISSIONS.CHAIN_READ,
  // },
  // { to: '/chain', label: 'Trade chain', icon: <FiGitBranch />, permission: PERMISSIONS.CHAIN_READ },
  {
    to: '/purchase',
    label: 'Purchase',
    icon: <FiShoppingCart />,
    permission: PERMISSIONS.DEMAND_READ,
  },
  {
    to: '/sales',
    label: 'Sales',
    icon: <FiTrendingUp />,
    permission: PERMISSIONS.SALES_WORKLIST_READ,
  },
  {
    to: '/accounts',
    label: 'Accounts',
    icon: <FiDollarSign />,
    permission: PERMISSIONS.CHAIN_READ_FULL,
  },
  { to: '/marg', label: 'Marg', icon: <FiFileText />, permission: PERMISSIONS.MARG_KEY },
  {
    to: '/dock',
    label: 'Dock & movements',
    icon: <FiTruck />,
    permission: PERMISSIONS.DOCK_INSPECT,
  },
  {
    to: '/registers',
    label: 'Registers',
    icon: <FiBarChart2 />,
    permission: [PERMISSIONS.REGISTER_SALES_READ, PERMISSIONS.REGISTER_PURCHASE_READ],
  },
  {
    to: '/logistics',
    label: 'Logistics',
    icon: <FiPackage />,
    permission: PERMISSIONS.LOGISTICS_READ,
  },
  {
    to: '/controller',
    label: 'Controller',
    icon: <FiSliders />,
    permission: PERMISSIONS.EXCEPTION_READ,
  },
  {
    to: '/notifications',
    label: 'Notifications',
    icon: <FiBell />,
    permission: PERMISSIONS.NOTIFICATION_LOG_READ,
  },
  {
    to: '/founder',
    label: 'Founder',
    icon: <FiEye />,
    permission: PERMISSIONS.FOUNDER_OVERVIEW_READ,
  },
];

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

function NavGroup({
  item,
  onNavigate,
}: {
  item: NavItem & { children: NavChild[] };
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const containsActiveChild = item.children.some((child) => location.pathname.startsWith(child.to));
  const [open, setOpen] = useState(containsActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          containsActiveChild
            ? 'text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <span className="text-lg" aria-hidden>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.label}</span>
        <span aria-hidden>{open ? <FiChevronDown /> : <FiChevronRight />}</span>
      </button>
      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-slate-200 pl-3">
          {item.children.map((child) => (
            <NavLink key={child.to} to={child.to} onClick={onNavigate} className={navLinkClasses}>
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { hasPermission } = useAuth();
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV_ITEMS.filter((item) => [item.permission].flat().some((p) => hasPermission(p))).map(
        (item) =>
          item.children ? (
            <NavGroup
              key={item.label}
              item={item as NavItem & { children: NavChild[] }}
              onNavigate={onNavigate}
            />
          ) : (
            <NavLink
              key={item.to}
              to={item.to!}
              end={item.to === '/'}
              onClick={onNavigate}
              className={navLinkClasses}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ),
      )}
    </nav>
  );
}

/**
 * A quick "log a call" jump — Sales-only, so it's scoped to `/sales/*`
 * rather than living in the sidebar. Type a firm, owner, mobile or GSTIN,
 * pick the buyer, and it takes the rep straight to his call workspace
 * (`/sales/call/:buyerId`) without first opening his buyer file. The route
 * takes the buyer's own id, not the counterparty id the box used to ask for,
 * so the rep picks a name and never has to know either.
 */
function SalesQuickCallControl() {
  const location = useLocation();
  const navigate = useNavigate();
  const { callApi } = useAuth();
  const [text, setText] = useState('');
  const [buyers, setBuyers] = useState<BuyerListRow[] | null>(null);
  const [open, setOpen] = useState(false);

  if (!location.pathname.startsWith('/sales')) return null;

  const needle = text.trim().toLowerCase();
  const matches = needle
    ? (buyers ?? [])
        .filter((b) =>
          [b.firm, b.contactName, b.mobile, b.gstin, b.tehsil].some((f) =>
            f?.toLowerCase().includes(needle),
          ),
        )
        .slice(0, 8)
    : [];

  function loadBuyers(): void {
    if (buyers !== null) return;
    void callApi((token) => listSalesBuyers(token))
      .then(setBuyers)
      .catch(() => setBuyers([]));
  }

  function go(buyerId: string): void {
    setOpen(false);
    setText('');
    navigate(`/sales/call/${buyerId}`);
  }

  return (
    <form
      className="relative mb-4 flex items-center justify-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (matches.length === 1) go(matches[0].buyerId);
      }}
    >
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            loadBuyers();
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          placeholder="Firm, owner, mobile or GSTIN"
          aria-label="Find a buyer to log a call"
          className="w-64 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline focus:outline-2 focus:outline-brand-500/30"
        />
        {open && needle && (
          <ul className="absolute right-0 z-20 mt-1 max-h-72 w-80 overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
            {buyers === null ? (
              <li className="px-3 py-2 text-slate-500">Loading…</li>
            ) : matches.length === 0 ? (
              <li className="px-3 py-2 text-slate-500">No buyer matches &quot;{text.trim()}&quot;.</li>
            ) : (
              matches.map((b) => (
                <li key={b.buyerId}>
                  <button
                    type="button"
                    // onMouseDown, not onClick: the input's blur would close the list first.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      go(b.buyerId);
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{b.firm || '(no firm name)'}</span>
                    <span className="block text-xs text-slate-500">
                      {[b.contactName, b.mobile, b.tehsil].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={matches.length !== 1}
        title={matches.length === 1 ? undefined : 'Pick a buyer from the list'}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-500/50"
      >
        <FiPhoneCall aria-hidden />
        Log a call
      </button>
    </form>
  );
}

/**
 * The persistent shell every authenticated route renders inside. Replaces
 * `App.tsx`'s old flat, repeated `<Nav/>` — a real sidebar on desktop that
 * collapses to a top bar + slide-over on narrow screens.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { logout, me } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  // The Accounts desk brings its own rail and padding and uses the full width (accounts.css).
  const fullBleed = useLocation().pathname.startsWith('/accounts');

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="border-b border-slate-200 px-4 py-4">
            <span className="text-lg font-semibold text-brand-600">TriFid</span>
          </div>
          <SidebarLinks />
          <div className="border-t border-slate-200 p-3">
            <div className="mb-2 truncate px-3 text-xs text-slate-500">{me?.email}</div>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <FiLogOut aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="text-lg font-semibold text-brand-600">TriFid</span>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          >
            <FiMenu className="text-xl" />
          </button>
        </div>

        {/* Mobile slide-over */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <span className="text-lg font-semibold text-brand-600">TriFid</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                >
                  <FiX />
                </button>
              </div>
              <SidebarLinks onNavigate={() => setMobileOpen(false)} />
              <div className="border-t border-slate-200 p-3">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <FiLogOut aria-hidden />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main
          className={`min-w-0 flex-1 pt-20 md:pt-0 ${
            fullBleed ? '' : 'px-4 py-6 pt-20 md:px-8 md:py-8 md:pt-8'
          }`}
        >
          <div className={fullBleed ? '' : 'mx-auto max-w-5xl'}>
            <SalesQuickCallControl />
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
