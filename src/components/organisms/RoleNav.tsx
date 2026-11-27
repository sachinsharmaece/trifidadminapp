import { useState } from 'react';
import { Link } from 'react-router';
import { navSectionsFor } from '@/app/navigation';
import type { Role } from '@/types/roles';

/**
 * The left menu, as the reference (components/layout/RoleNav.tsx): "TriFid Admin", one collapsible section per desk,
 * and at the bottom the person's name · role and Sign out. Below the md width it is a drawer opened by the ☰ button.
 */
export function RoleNav(props: {
  role: Role;
  name: string;
  position: string | null;
  onSignOut: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = navSectionsFor(props.role, props.position);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-3 z-30 flex min-h-11 min-w-11 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-700 shadow-sm md:hidden"
      >
        ☰
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 transform flex-col border-r border-zinc-200 bg-white transition-transform duration-200 md:relative md:z-0 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
          <Link
            to="/dashboard"
            className="text-sm font-semibold text-zinc-900"
            onClick={() => setMobileOpen(false)}
          >
            TriFid Admin
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="flex min-h-11 min-w-11 items-center justify-center text-zinc-400 md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section) => (
            <details key={section.section} className="group mb-4">
              <summary className="flex min-h-11 w-full list-none items-center justify-between rounded px-2 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {section.section}
                </span>
                <span className="text-sm text-zinc-400 transition-transform group-open:rotate-90">
                  ▶
                </span>
              </summary>
              {section.links.length === 0 ? (
                <p className="px-2 py-2 text-sm text-zinc-300">No screens yet</p>
              ) : (
                section.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className="block min-h-11 rounded px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    {link.label}
                  </Link>
                ))
              )}
            </details>
          ))}
        </nav>

        <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500">
          <p className="mb-2">
            {props.name} · {props.role}
          </p>
          <button
            type="button"
            onClick={props.onSignOut}
            className="min-h-11 text-zinc-500 hover:text-zinc-900"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
