import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiUsers,
  FiDatabase,
  FiUserCheck,
  FiGitBranch,
  FiInbox,
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
} from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { PERMISSIONS } from '../lib/permissions';

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
  {
    to: '/enquiries',
    label: 'Enquiries',
    icon: <FiInbox />,
    permission: PERMISSIONS.CHAIN_READ,
  },
  { to: '/chain', label: 'Trade chain', icon: <FiGitBranch />, permission: PERMISSIONS.CHAIN_READ },
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
    permission: PERMISSIONS.RECEIPT_READ,
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
 * The persistent shell every authenticated route renders inside. Replaces
 * `App.tsx`'s old flat, repeated `<Nav/>` — a real sidebar on desktop that
 * collapses to a top bar + slide-over on narrow screens.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { logout, me } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
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

      <main className="min-w-0 flex-1 px-4 py-6 pt-20 md:px-8 md:py-8 md:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
