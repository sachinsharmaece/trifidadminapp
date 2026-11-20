import { NavLink } from 'react-router';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/cn';
import type { MenuItem } from '@/types/navigation';

interface NavigationMenuProps {
  items: readonly MenuItem[];
  /** Called after a link is clicked, e.g. to close the mobile drawer. */
  onNavigate?: () => void;
}

/** The list of navigation links. It draws whatever items it is given; it does not decide who may see what. */
export function NavigationMenu({ items, onNavigate }: NavigationMenuProps) {
  return (
    <nav aria-label="Main navigation">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.path}>
            {/* NavLink adds aria-current="page" to the active link by itself. */}
            <NavLink
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
