import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CallLineFields } from '../src/desks/sales/CallLineFields';
import { useAuth } from '../src/auth/AuthContext';
import { getSkusForProduct, searchProducts } from '../src/api/catalog';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/catalog', () => ({ searchProducts: vi.fn(), getSkusForProduct: vi.fn() }));

function renderRow(props: Partial<Parameters<typeof CallLineFields>[0]> = {}) {
  const handlers = {
    onSkuChange: vi.fn(),
    onQtyChange: vi.fn(),
    onExpectedRateChange: vi.fn(),
  };
  render(<CallLineFields index={0} qty={1} expectedRate="" {...handlers} {...props} />);
  return handlers;
}

async function pickProduct(text: string) {
  const box = screen.getByRole('combobox', { name: /^product/i });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: text } });
  const option = await screen.findByRole('option', { name: /Crocin/ });
  fireEvent.mouseDown(option);
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    callApi: ((fn: (token: string) => unknown) => fn('token')) as never,
  } as never);
  vi.mocked(searchProducts)
    .mockReset()
    .mockResolvedValue([{ productId: 'p-1', brand: 'Crocin', technical: 'Paracetamol' }]);
  vi.mocked(getSkusForProduct).mockReset();
});

describe('Log a buyer call — one product row', () => {
  it('searches as you type, and a product with a single pack needs no pack choosing', async () => {
    vi.mocked(getSkusForProduct).mockResolvedValue([
      { skuId: 'sku-1', packLabel: '10 x 10', unitsPerBox: 100 },
    ] as never);
    const { onSkuChange } = renderRow();

    await pickProduct('croc');
    expect(searchProducts).toHaveBeenLastCalledWith('token', 'croc');
    expect(getSkusForProduct).toHaveBeenCalledWith('token', 'p-1');
    await waitFor(() => expect(onSkuChange).toHaveBeenLastCalledWith('sku-1'));
    expect(screen.getByRole('combobox', { name: /^product/i })).toHaveValue('Crocin — Paracetamol');
  });

  it('with several packs, reports no pack until one is chosen', async () => {
    vi.mocked(getSkusForProduct).mockResolvedValue([
      { skuId: 'sku-1', packLabel: '10 x 10', unitsPerBox: 100 },
      { skuId: 'sku-2', packLabel: '10 x 15', unitsPerBox: 150 },
    ] as never);
    const { onSkuChange } = renderRow();

    await pickProduct('croc');
    await screen.findByRole('option', { name: /10 x 15/ });
    expect(onSkuChange).toHaveBeenLastCalledWith('');

    fireEvent.change(screen.getByLabelText(/pack/i), { target: { value: 'sku-2' } });
    expect(onSkuChange).toHaveBeenLastCalledWith('sku-2');
  });

  it('keeps the pack disabled until a product is picked, and reports quantity and rate', () => {
    const { onQtyChange, onExpectedRateChange } = renderRow();
    expect(screen.getByLabelText(/pack/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/qty/i), { target: { value: '7' } });
    expect(onQtyChange).toHaveBeenCalledWith(7);
    fireEvent.change(screen.getByLabelText(/expected rate/i), { target: { value: '99.5' } });
    expect(onExpectedRateChange).toHaveBeenCalledWith('99.5');
  });

  it('offers Remove only when asked to, and shows a refused line’s reason', () => {
    const onRemove = vi.fn();
    renderRow({ onRemove, error: 'Buyers only.' });
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Not logged: Buyers only.');
  });
});
