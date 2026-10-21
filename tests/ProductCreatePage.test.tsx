import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCreatePage } from '../src/desks/admin/ProductCreatePage';
import { useAuth } from '../src/auth/AuthContext';
import {
  createHsn,
  createProduct,
  createTechnical,
  getAllManufacturers,
  getHsnMasters,
  getTechnicalMasters,
} from '../src/api/catalog';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/components/dev/DevNote', () => ({ DevNote: () => null }));
vi.mock('../src/api/catalog', () => ({
  createProduct: vi.fn(),
  createTechnical: vi.fn(),
  createHsn: vi.fn(),
  createManufacturer: vi.fn(),
  getAllManufacturers: vi.fn(),
  getHsnMasters: vi.fn(),
  getTechnicalMasters: vi.fn(),
}));

function renderPage() {
  render(
    <MemoryRouter>
      <ProductCreatePage />
    </MemoryRouter>,
  );
}

async function pick(label: RegExp, typed: string, optionName: RegExp) {
  const box = screen.getByRole('combobox', { name: label });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: typed } });
  fireEvent.mouseDown(await screen.findByRole('option', { name: optionName }));
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
  } as never);
  vi.mocked(getTechnicalMasters)
    .mockReset()
    .mockResolvedValue([{ technicalId: 't1', name: 'Glyphosate 41% SL' }]);
  vi.mocked(getAllManufacturers)
    .mockReset()
    .mockResolvedValue([{ manufacturerId: 'm1', name: 'Bayer' }]);
  vi.mocked(getHsnMasters)
    .mockReset()
    .mockResolvedValue([
      { hsnId: 'h1', code: '38089199', description: 'Insecticides', taxPercent: 18 },
    ]);
  vi.mocked(createProduct).mockReset().mockResolvedValue({ productId: 'p1', skuIds: [] });
  vi.mocked(createTechnical).mockReset();
  vi.mocked(createHsn).mockReset();
});

describe('Create product', () => {
  it('labels the name field "Product" and offers the three categories', async () => {
    renderPage();
    expect(screen.getByLabelText(/^product/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^brand/i)).toBeNull();
    const category = screen.getByLabelText(/category/i);
    expect(Array.from((category as HTMLSelectElement).options).map((o) => o.text)).toEqual([
      'Seed',
      'Pesticide',
      'Fertilizer',
    ]);
  });

  it('fills the tax % from the HSN master, keeps it editable, and submits category, tax and packs', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^product/i), { target: { value: 'Roundup' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'fertilizer' } });
    await pick(/^technical/i, 'gly', /Glyphosate/);
    await pick(/^manufacturer/i, 'bay', /Bayer/);
    await pick(/^hsn/i, '3808', /38089199/);

    const tax = screen.getByLabelText(/tax %/i) as HTMLInputElement;
    expect(tax.value).toBe('18');
    fireEvent.change(tax, { target: { value: '5' } });

    fireEvent.change(screen.getByLabelText('Pack 1 size'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Pack 1 unit'), { target: { value: 'ML' } });
    fireEvent.change(screen.getByLabelText('Pack 1 units in box'), { target: { value: '24' } });
    expect(screen.getByText('One box holds 12 LTR.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add pack/i }));
    fireEvent.change(screen.getByLabelText('Pack 2 size'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Pack 2 units in box'), { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: /^create product/i }));
    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
    expect(createProduct).toHaveBeenCalledWith('token', {
      brand: 'Roundup',
      technical: 'Glyphosate 41% SL',
      manufacturerId: 'm1',
      hsn: '38089199',
      category: 'fertilizer',
      taxPercent: 5,
      class: 'Medium',
      packs: [
        { packSize: 500, unit: 'ML', unitsPerBox: 24 },
        { packSize: 1, unit: 'LTR', unitsPerBox: 12 },
      ],
    });
  });

  it('does not submit until technical, manufacturer and HSN are picked', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^product/i), { target: { value: 'Roundup' } });
    fireEvent.click(screen.getByRole('button', { name: /^create product/i }));
    expect(await screen.findByText(/pick a technical/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a manufacturer/i)).toBeInTheDocument();
    expect(screen.getByText(/pick an hsn/i)).toBeInTheDocument();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('adds a missing technical from the dropdown and selects it', async () => {
    vi.mocked(createTechnical).mockResolvedValue({ technicalId: 't2' });
    renderPage();
    const box = screen.getByRole('combobox', { name: /^technical/i });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: 'Azadirachtin' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /add new technical/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Add technical');
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(createTechnical).toHaveBeenCalledWith('token', 'Azadirachtin'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('combobox', { name: /^technical/i })).toHaveValue('Azadirachtin');
  });

  it('adds a missing HSN with its tax % and fills the tax field', async () => {
    vi.mocked(createHsn).mockResolvedValue({ hsnId: 'h2' });
    renderPage();
    const box = screen.getByRole('combobox', { name: /^hsn/i });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: '31051000' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /add new hsn/i }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^tax %/i), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(createHsn).toHaveBeenCalledWith('token', {
        code: '31051000',
        description: undefined,
        taxPercent: 5,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('combobox', { name: /^hsn/i })).toHaveValue('31051000');
    expect(createProduct).not.toHaveBeenCalled();
  });
});
