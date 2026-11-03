import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { ToastProvider } from '../src/components/ui/Toast';
import { ApiError } from '../src/api/errors';
import { getPoPrintData, getPoQueue, type PoPrintDto } from '../src/api/purchase';
import { PoPage } from '../src/desks/purchase/PoPage';
import { buildPoHtml, escapeHtml } from '../src/desks/purchase/poDocument';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/purchase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/purchase')>()),
  getPoQueue: vi.fn(),
  getPoPrintData: vi.fn(),
}));

const PRINT: PoPrintDto = {
  poNo: 'PO-26-0007',
  releasedAt: '2026-11-03T05:30:00.000Z',
  company: {
    name: 'TriFid Stores Pvt. Ltd.',
    addressLines: ['Runija Road, Barnagar'],
    gstin: '23AAHCT4156E1ZJ',
  },
  seller: {
    firm: 'Madhya Bharat Agro Suppliers',
    gstin: '23BBBBB1111B1Z6',
    addressLines: ['12 Market Road', 'Ujjain, Madhya Pradesh – 456001'],
  },
  lines: [
    {
      brand: 'DEMO GrassOut',
      packLabel: '350 ML',
      boxes: 100,
      baseUnit: 'LTR',
      baseUnitsPerBox: 10.5,
      ratePaise: 1_000_000,
      taxablePaise: 1_050_000_000,
    },
  ],
  taxablePaise: 1_050_000_000,
  gst: {
    ratePercent: 18,
    kind: 'intra_state',
    cgstPaise: 94_500_000,
    sgstPaise: 94_500_000,
    igstPaise: 0,
  },
  totalPaise: 1_239_000_000,
  dispatchBy: '2026-11-03T10:30:00.000Z',
  terms: [],
};

describe('buildPoHtml', () => {
  it('has the company block, PO number and date, seller, lines, GST and total', () => {
    const html = buildPoHtml(PRINT);
    expect(html).toContain('TriFid Stores Pvt. Ltd.');
    expect(html).toContain('Runija Road, Barnagar');
    expect(html).toContain('23AAHCT4156E1ZJ');
    expect(html).toContain('PO-26-0007');
    expect(html).toContain('03/11/2026');
    expect(html).toContain('Madhya Bharat Agro Suppliers');
    expect(html).toContain('23BBBBB1111B1Z6');
    expect(html).toContain('DEMO GrassOut');
    expect(html).toContain('350 ML');
    // 100 boxes × 10.5 L, the rate per litre in rupees with Indian grouping, and the amount.
    expect(html).toContain('1,050 L');
    expect(html).toContain('₹10,000.00 / L');
    expect(html).toContain('₹1,05,00,000.00');
    expect(html).toContain('CGST @ 9%');
    expect(html).toContain('SGST @ 9%');
    expect(html).not.toContain('IGST');
    expect(html).toContain('₹1,23,90,000.00');
    expect(html).toContain('Due by');
  });

  it('shows IGST for a seller in another state', () => {
    const html = buildPoHtml({
      ...PRINT,
      gst: {
        ratePercent: 18,
        kind: 'inter_state',
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 189_000_000,
      },
    });
    expect(html).toContain('IGST @ 18%');
    expect(html).not.toContain('CGST');
  });

  it('has no terms section until terms are supplied, then lists them', () => {
    expect(buildPoHtml(PRINT)).not.toContain('<h3>Terms</h3>');
    const html = buildPoHtml({ ...PRINT, terms: ['Goods to match the PO.'] });
    expect(html).toContain('<h3>Terms</h3>');
    expect(html).toContain('Goods to match the PO.');
  });

  it('escapes anything that came from the server', () => {
    const html = buildPoHtml({
      ...PRINT,
      seller: { ...PRINT.seller, firm: '<img src=x onerror=alert(1)> & Sons' },
    });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; Sons');
    expect(escapeHtml(`"'`)).toBe('&quot;&#39;');
  });

  it('reads a seller with no GSTIN as a dash', () => {
    expect(buildPoHtml({ ...PRINT, seller: { ...PRINT.seller, gstin: null } })).toContain(
      'GSTIN: —',
    );
  });
});

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    login: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => true,
    status: 'authenticated',
    me: null,
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
    sessionExpiredNotice: false,
    dismissSessionExpiredNotice: vi.fn(),
  });
  vi.mocked(getPoQueue)
    .mockReset()
    .mockResolvedValue([
      {
        poId: 'po1',
        poNo: 'PO-26-0007',
        sellerId: 's1',
        sellerFirm: 'Madhya Bharat Agro Suppliers',
        brand: 'DEMO GrassOut',
        packLabel: '350 ML',
        boxes: 100,
        releasedAt: '2026-11-03T05:30:00.000Z',
        dispatchDueDate: '2026-11-03T05:30:00.000Z',
        hoursLeft: 4,
        invoiceNo: null,
        invoiceDate: null,
        ewayNo: null,
      },
      {
        poId: 'po2',
        poNo: 'PO-26-0008',
        sellerId: 's2',
        sellerFirm: 'Narmada Traders',
        brand: 'DEMO ImidaPro',
        packLabel: '1 L',
        boxes: 20,
        releasedAt: '2026-11-03T06:30:00.000Z',
        dispatchDueDate: '2026-11-03T06:30:00.000Z',
        hoursLeft: 5,
        invoiceNo: null,
        invoiceDate: null,
        ewayNo: null,
      },
    ]);
  vi.mocked(getPoPrintData).mockReset().mockResolvedValue(PRINT);
});

afterEach(() => {
  document.title = '';
});

// The page also holds the "Seller billed" button, which needs the toast context.
const renderPage = () =>
  render(
    <ToastProvider>
      <PoPage />
    </ToastProvider>,
  );

describe('PO page — Download PDF', () => {
  it('is on every PO row', async () => {
    renderPage();
    await screen.findByText('PO-26-0007');
    expect(screen.getAllByRole('button', { name: 'Download PDF' })).toHaveLength(2);
  });

  it('fetches that PO, previews it, and prints it from the preview named after the PO', async () => {
    renderPage();
    const row = (await screen.findByText('PO-26-0008')).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Download PDF' }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(getPoPrintData).toHaveBeenCalledWith('token', 'po2'));
    const frame = (await within(dialog).findByTitle('Preview of PO-26-0008')) as HTMLIFrameElement;
    expect(frame.getAttribute('srcdoc')).toContain('PO-26-0007'); // The mocked data's own number.
    expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');

    const print = vi.spyOn(frame.contentWindow!, 'print').mockImplementation(() => {
      expect(document.title).toBe('PO-26-0007'); // The file name the browser suggests.
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Download PDF/ }));
    expect(print).toHaveBeenCalledTimes(1);
    frame.contentWindow!.dispatchEvent(new Event('afterprint'));
    expect(document.title).toBe('');
  });

  it('says so inline when the data cannot be fetched, and can try again', async () => {
    vi.mocked(getPoPrintData)
      .mockRejectedValueOnce(new ApiError({ code: 'NOT_FOUND', message: 'PO not found.' }))
      .mockResolvedValue(PRINT);
    renderPage();
    const row = (await screen.findByText('PO-26-0007')).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Download PDF' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('PO not found.');
    expect(within(dialog).getByRole('button', { name: /Download PDF/ })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Try again' }));
    expect(await within(dialog).findByTitle('Preview of PO-26-0007')).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).toBeNull();
  });

  it('shows an inline error if the print dialog cannot open', async () => {
    renderPage();
    const row = (await screen.findByText('PO-26-0007')).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Download PDF' }));
    const dialog = await screen.findByRole('dialog');
    const frame = (await within(dialog).findByTitle('Preview of PO-26-0007')) as HTMLIFrameElement;
    vi.spyOn(frame.contentWindow!, 'print').mockImplementation(() => {
      throw new Error('blocked');
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Download PDF/ }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Could not open the print/);
    expect(document.title).toBe('');
  });
});
