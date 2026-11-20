import { useEffect } from 'react';

const APP_NAME = 'TriFid';

/** Sets the browser tab title to "<title> · TriFid" while the calling component is on screen. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
