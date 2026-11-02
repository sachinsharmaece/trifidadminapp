import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../src/auth/AuthContext';
import { ApiError } from '../src/api/errors';
import { proxyCreateListing } from '../src/api/proxy';
import type { SellerCatalogueItem } from '../src/api/purchase';
import { ToastProvider } from '../src/components/ui/Toast';
import { CatalogueCompanyGroup } from '../src/desks/purchase/CatalogueProductRow';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/proxy', () => ({ proxyCreateListing: vi.fn() }));

beforeEach(() => {
  // Only the date is held still, so the expiry bands do not drift with the calendar.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2));
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
  vi.mocked(proxyCreateListing)
    .mockReset()
    .mockResolvedValue({ listingId: 'l1', lineIds: ['a', 'b', 'c'] });
});
afterEach(() => vi.useRealTimers());

const pack = (skuId: string, packLabel: string, extra: object = {}) => ({
  skuId,
  packLabel,
  skuState: 'live',
  listed: false,
  listingRatePaise: null,
  ...extra,
});
const zura = (over: Partial<SellerCatalogueItem> = {}): SellerCatalogueItem =>
  ({
    entryId: null,
    source: 'dealership',
    productId: 'p1',
    brand: 'zura',
    technical: 'Metalaxyl',
    manufacturerName: 'Syngenta',
    productState: 'live',
    manufacturerState: 'live',
    productActive: true,
    packsDetailed: false,
    packs: [pack('k1', '1 LTR'), pack('k2', '500 ML'), pack('k3', '250 ML')],
    setAt: '2026-10-24T00:00:00.000Z',
    setBy: null,
    ...over,
  }) as SellerCatalogueItem;

function show(item = zura(), handlers = { onListed: vi.fn(), onMoreOptions: vi.fn() }) {
  render(
    <ToastProvider>
      <CatalogueCompanyGroup
        name="Syngenta"
        items={[item]}
        defaultOpen
        sellerCounterpartyId="c1"
        {...handlers}
      />
    </ToastProvider>,
  );
  return handlers;
}
const pick = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Add to listing' }));
const note = (text = 'Called him, gave these.') =>
  fireEvent.change(screen.getByLabelText(/^Authority/), { target: { value: text } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Put it on the board/ }));

/** Row 1 of the sheet: 1 LTR, 25-27, March, 280, MOQ 1, 100 boxes. */
function fillFirstRow() {
  pick('Pack, row 1', 'k1');
  pick('Expiry year, row 1', '2027');
  pick('Expiry month, row 1', '3');
  pick('Rate, row 1', '280');
  pick('MOQ, row 1', '1');
  pick('Boxes, row 1', '100');
}

describe('Add to listing, in place (2 Nov)', () => {
  it('opens the rows on the product card, and closes them again', () => {
    show();
    expect(screen.queryByRole('form', { name: 'List zura' })).toBeNull();
    open();
    expect(screen.getByRole('form', { name: 'List zura' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('form', { name: 'List zura' })).toBeNull();
  });

  it('is off, with the reason, for a product with no pack yet', () => {
    show(zura({ packs: [] }));
    expect(screen.getByRole('button', { name: 'Add to listing' })).toBeDisabled();
    expect(screen.getByText(/Can’t be listed yet — it has no active pack yet/)).toBeInTheDocument();
  });

  it('lists the whole sheet in one go: three packs, expiry copied down, delivery and provenance defaulted', async () => {
    const handlers = show();
    open();
    fillFirstRow();
    expect(screen.getByText('Under 12 months')).toBeInTheDocument(); // March 2027, four months off.

    fireEvent.click(screen.getByRole('button', { name: 'Add another pack' }));
    // The new row starts on the next pack, with the expiry of the row above.
    expect((screen.getByLabelText('Pack, row 2') as HTMLSelectElement).value).toBe('k2');
    expect((screen.getByLabelText('Expiry year, row 2') as HTMLSelectElement).value).toBe('2027');
    expect((screen.getByLabelText('Expiry month, row 2') as HTMLSelectElement).value).toBe('3');
    pick('Rate, row 2', '150');
    pick('Boxes, row 2', '50');

    fireEvent.click(screen.getByRole('button', { name: 'Add another pack' }));
    pick('Expiry year, row 3', '2028'); // 26-28, March 2028: over a year off.
    expect(screen.getAllByText('Over 12 months')).toHaveLength(1);
    pick('Rate, row 3', '80');
    pick('Boxes, row 3', '20');
    expect(screen.getByRole('button', { name: 'Add another pack' })).toBeDisabled(); // All three used.

    note();
    submit();
    await waitFor(() => expect(proxyCreateListing).toHaveBeenCalledTimes(1));
    const body = vi.mocked(proxyCreateListing).mock.calls[0]![1];
    expect(body).toMatchObject({
      sellerCounterpartyId: 'c1',
      productId: 'p1',
      scopeType: 'all_india',
      callNote: 'Called him, gave these.',
    });
    expect(body.lines).toEqual([
      {
        skuId: 'k1',
        ratePaise: 28000,
        expiryBand: 'under12',
        expiryExact: '03/2027',
        moqExact: 1,
        deliveryBand: '48h',
        provenance: 'company',
        qty: 100,
      },
      {
        skuId: 'k2',
        ratePaise: 15000,
        expiryBand: 'under12',
        expiryExact: '03/2027',
        moqExact: 1, // Left blank on the sheet: 1.
        deliveryBand: '48h',
        provenance: 'company',
        qty: 50,
      },
      {
        skuId: 'k3',
        ratePaise: 8000,
        expiryBand: 'over12',
        expiryExact: '03/2028',
        moqExact: 1,
        deliveryBand: '48h',
        provenance: 'company',
        qty: 20,
      },
    ]);
    // Done in place: the file reloads quietly and the rows close.
    await waitFor(() => expect(handlers.onListed).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('zura: 3 packs on the board.')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'List zura' })).toBeNull();
  });
});

describe('Defaults, and the optional month (2 Nov)', () => {
  it("opens on this year's pair with no month, and has no territory to pick", () => {
    show();
    open();
    expect((screen.getByLabelText('Expiry year, row 1') as HTMLSelectElement).value).toBe('2028'); // 26-28.
    expect(screen.getByRole('option', { name: '26-28' })).toBeInTheDocument();
    expect((screen.getByLabelText('Expiry month, row 1') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByLabelText('Territory')).toBeNull();
    // Without a month the band is counted from January, so it never promises more than the year.
    expect(screen.getByText('Over 12 months · month not given')).toBeInTheDocument();
  });

  it('lists with no month: the band from the year, and no exact month sent', async () => {
    show();
    open();
    // The year before: January 2027 is under a year away.
    pick('Expiry year, row 1', '2027');
    expect(screen.getByText('Under 12 months · month not given')).toBeInTheDocument();
    pick('Expiry year, row 1', '2028');

    pick('Pack, row 1', 'k1');
    pick('Rate, row 1', '280');
    pick('Boxes, row 1', '100');
    note();
    submit();
    await waitFor(() => expect(proxyCreateListing).toHaveBeenCalledTimes(1));
    const line = vi.mocked(proxyCreateListing).mock.calls[0]![1].lines[0]!;
    expect(line).toMatchObject({ expiryBand: 'over12', moqExact: 1, qty: 100 });
    expect(line).not.toHaveProperty('expiryExact');
  });
});

describe('What the rows refuse, and what they leave to the full form', () => {
  it('says which row is wrong, and sends nothing', async () => {
    show();
    open();
    note();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Row 1: pick the pack.');

    pick('Pack, row 1', 'k1');
    pick('Expiry year, row 1', '');
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Row 1: pick the expiry year.');
    pick('Expiry year, row 1', '2028');

    submit();
    // The year opens on this year's pair and the month is optional, so the rate is next.
    expect(screen.getByRole('alert')).toHaveTextContent('Row 1: enter the rate in rupees');

    pick('Rate, row 1', '280');
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Row 1: boxes is a whole number');
    expect(proxyCreateListing).not.toHaveBeenCalled();
  });

  it('refuses the same pack in two rows', () => {
    show();
    open();
    fillFirstRow();
    fireEvent.click(screen.getByRole('button', { name: 'Add another pack' }));
    pick('Pack, row 2', 'k1');
    pick('Rate, row 2', '150');
    pick('Boxes, row 2', '5');
    note();
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Row 2: that pack is already in another row.',
    );

    expect(proxyCreateListing).not.toHaveBeenCalled();
  });

  it("shows the server's refusal and keeps the rows", async () => {
    vi.mocked(proxyCreateListing).mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_FAILED',
        message:
          'You already have a live listing at this exact rate and condition set on this pack.',
      }),
    );
    show();
    open();
    fillFirstRow();
    note();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('already have a live listing');
    expect((screen.getByLabelText('Rate, row 1') as HTMLInputElement).value).toBe('280');
    expect(screen.getByRole('form', { name: 'List zura' })).toBeInTheDocument();
  });

  it('shows what is already on the board for a pack, and a one-pack product starts on it', () => {
    show(
      zura({
        packs: [pack('k1', '1 LTR', { listed: true, listingRatePaise: 28000 })],
      }),
    );
    open();
    expect((screen.getByLabelText('Pack, row 1') as HTMLSelectElement).value).toBe('k1');
    expect(
      screen.getByRole('option', { name: '1 LTR — on the board ₹280.00' }),
    ).toBeInTheDocument();
  });

  it('"More options" goes to the full form for this product', () => {
    const handlers = show();
    open();
    fireEvent.click(screen.getByRole('button', { name: /More options/ }));
    expect(handlers.onMoreOptions).toHaveBeenCalledWith('p1');
  });

  it('needs the authority note before it can be put on the board', () => {
    show();
    open();
    expect(screen.getByRole('button', { name: /Put it on the board/ })).toBeDisabled();
    note('x');
    expect(screen.getByRole('button', { name: /Put it on the board/ })).toBeEnabled();
  });
});
