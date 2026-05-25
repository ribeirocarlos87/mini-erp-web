import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PDVProducts from './PDVProducts';
import { productService } from '../../services/productService';
import { usePDVStore } from '../../store/pdvStore';

vi.mock('../../services/productService', () => ({
  productService: { getProducts: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
  (productService.getProducts as any).mockResolvedValue([
    { id: 1, name: 'Camiseta', code: 'CAM-001', priceSale: 100, quantityStock: 10 },
    { id: 2, name: 'Calça', code: 'CAL-001', priceSale: 200, quantityStock: 5 },
  ]);
});

describe('PDVProducts', () => {
  it('chama getProducts ao montar e renderiza items', async () => {
    render(<PDVProducts />);
    expect(productService.getProducts).toHaveBeenCalled();
    expect(await screen.findByText('Camiseta')).toBeInTheDocument();
    expect(screen.getByText('Calça')).toBeInTheDocument();
  });

  it('aceita resposta como array direto ou { products }', async () => {
    (productService.getProducts as any).mockResolvedValue({ products: [{ id: 99, name: 'Único', code: 'X', priceSale: 50, quantityStock: 1 }] });
    render(<PDVProducts />);
    expect(await screen.findByText('Único')).toBeInTheDocument();
  });
});
