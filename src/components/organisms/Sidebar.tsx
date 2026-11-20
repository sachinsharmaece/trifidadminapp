import { useEffect, useRef } from 'react';
import logoUrl from '@/assets/logo.svg';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/cn';
import type { MenuItem } from '@/types/navigation';
import { NavigationMenu } from './NavigationMenu';

interface SidebarProps {
  /** Lets the header's menu button point at this element (aria-controls). */
  id: string;
  items: readonly MenuItem[];
  /** Mobile only: is the drawer open? On md screens and up the sidebar is always shown. */
  open: boolean;
  onClose: () => void;
}

/** Fixed sidebar on md+ screens, slide-in drawer below that. */
export function Sidebar({ id, items, open, onClose }: SidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // While the drawer is open: move focus into it and let Escape close it.
  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Dark backdrop behind the mobile drawer. Clicking it closes the drawer. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 transition-opacity motion-reduce:transition-none md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        id={id}
        aria-label="Sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white',
          'motion-reduce:[transition:none]',
          'md:visible md:sticky md:top-0 md:z-auto md:h-screen md:shrink-0 md:translate-x-0',
          // `invisible` also removes the closed drawer from the tab order and from screen readers.
          // Opening: visibility flips at once, so focus() can land inside the drawer right away.
          // Closing: visibility waits 200ms, so the slide-out animation stays visible until it finishes.
          open
            ? 'visible translate-x-0 [transition:transform_200ms,visibility_0s]'
            : 'invisible -translate-x-full [transition:transform_200ms,visibility_0s_linear_200ms]',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt="" className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight">TriFid</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 md:hidden"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavigationMenu items={items} onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}
