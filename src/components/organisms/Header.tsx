import type { ReactNode, Ref } from 'react';
import logoUrl from '@/assets/logo.svg';
import { Icon } from '@/components/atoms/Icon';

interface HeaderProps {
  /** Id of the sidebar the menu button opens. */
  menuControlsId: string;
  menuOpen: boolean;
  onMenuClick: () => void;
  /** Lets the layout give focus back to the menu button when the drawer closes. */
  menuButtonRef?: Ref<HTMLButtonElement>;
  /** Right-hand side of the bar, e.g. a user menu. */
  children?: ReactNode;
}

/** Sticky top bar. The menu button (and the small logo next to it) only show below the md breakpoint. */
export function Header({
  menuControlsId,
  menuOpen,
  onMenuClick,
  menuButtonRef,
  children,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        aria-controls={menuControlsId}
        aria-expanded={menuOpen}
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
      >
        <Icon name="menu" />
      </button>
      <img src={logoUrl} alt="" className="h-7 w-7 md:hidden" />

      <div className="ml-auto flex items-center gap-3">{children}</div>
    </header>
  );
}
