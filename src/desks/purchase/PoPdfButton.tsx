import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import { getPoPrintData, type PoPrintDto, type PoStageItem } from '../../api/purchase';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { Modal } from '../../components/ui/Modal';
import { buildPoHtml } from './poDocument';

/**
 * 3 Nov (My view sheet) — "Download PDF" on a purchase order. The server sends the order's data;
 * the page is built here, shown in a preview, and saved as a PDF from the browser's print dialog
 * ("Save as PDF"), named after the PO number. Nothing is stored and no token leaves the request
 * that fetches the data.
 */
export function PoPdfButton({ po }: { po: Pick<PoStageItem, 'poId' | 'poNo'> }) {
  const { callApi } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PoPrintDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const restoreTitle = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await callApi((token) => getPoPrintData(token, po.poId)));
    } catch (caught) {
      setData(null);
      setError(
        caught instanceof ApiError ? caught.message : 'Could not prepare this purchase order.',
      );
    } finally {
      setLoading(false);
    }
  }, [callApi, po.poId]);

  // The browser's own file name is the page title, so it carries the PO number while printing.
  useEffect(
    () => () => {
      restoreTitle.current?.();
    },
    [],
  );

  const html = useMemo(() => (data ? buildPoHtml(data) : null), [data]);

  function show(): void {
    setOpen(true);
    void load();
  }

  function close(): void {
    setOpen(false);
    setData(null);
    setError(null);
  }

  function download(): void {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow || !data) {
      setError('The preview is not ready yet. Try again in a moment.');
      return;
    }
    const previousTitle = document.title;
    document.title = data.poNo;
    const restore = (): void => {
      document.title = previousTitle;
      frameWindow.removeEventListener('afterprint', restore);
      restoreTitle.current = null;
    };
    restoreTitle.current = restore;
    frameWindow.addEventListener('afterprint', restore);
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      restore();
      setError('Could not open the print dialog. Allow pop-ups and printing, then try again.');
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" icon={<FiDownload />} onClick={show}>
        Download PDF
      </Button>
      <Modal
        open={open}
        size="xl"
        title={`Purchase order ${po.poNo}`}
        onClose={close}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
            <Button icon={<FiPrinter />} disabled={!html} onClick={download}>
              Download PDF
            </Button>
          </>
        }
      >
        {loading && <Loader />}
        {error && (
          <div role="alert" className="mb-3 text-sm text-danger-500">
            {error}{' '}
            <button type="button" className="font-medium underline" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        {html && (
          <>
            <p className="mb-2 text-sm text-slate-500">
              In the print dialog choose &ldquo;Save as PDF&rdquo; as the destination.
            </p>
            <iframe
              ref={frameRef}
              title={`Preview of ${po.poNo}`}
              srcDoc={html}
              sandbox="allow-same-origin allow-modals"
              className="h-[65vh] w-full rounded-md border border-slate-300 bg-white"
            />
          </>
        )}
      </Modal>
    </>
  );
}
