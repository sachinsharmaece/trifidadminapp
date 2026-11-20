import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Header } from '@/components/organisms/Header';
import { Sidebar } from '@/components/organisms/Sidebar';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { MenuItem } from '@/types/navigation';

const SIDEBAR_ID = 'app-sidebar';

interface DashboardLayoutProps {
  navItems: readonly MenuItem[];
  /** Goes on the right of the header, e.g. a user menu. */
  headerEnd?: ReactNode;
  children: ReactNode;
}

/**
 * Sidebar + sticky header + main area.
 * Below the md breakpoint the sidebar becomes a drawer opened from the header's menu button.
 */
export function DashboardLayout({ navItems, headerEnd, children }: DashboardLayoutProps) {
  const [drawerRequested, setDrawerRequested] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  // The drawer can only be open on small screens. Growing the window closes it without any extra effect.
  const drawerOpen = drawerRequested && !isDesktop;

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => setDrawerRequested(false), []);

  // While the drawer is open, stop the page behind it from scrolling.
  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  // When the drawer closes, give focus back to the button that opened it.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !drawerOpen) {
      menuButtonRef.current?.focus();
    }
    wasOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar id={SIDEBAR_ID} items={navItems} open={drawerOpen} onClose={closeDrawer} />

      {/* `inert` makes everything behind the open drawer unreachable by keyboard and screen readers. */}
      <div inert={drawerOpen} className="flex min-w-0 flex-1 flex-col">
        <Header
          menuControlsId={SIDEBAR_ID}
          menuOpen={drawerOpen}
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setDrawerRequested(true)}
        >
          {headerEnd}
        </Header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none md:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
