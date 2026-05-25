import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { saleService } from './saleService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('saleService', () => {
  it('createSale envia POST /sales com payload', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    const payload = {
      client_id: 1,
      items: [{ product_id: 1, quantity: 1, unit_price: 100 }],
      payments: [{ method: 'cash', label: 'Dinheiro', amount: 100 }],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    };
    await saleService.createSale(payload as any);
    expect(mocked.post).toHaveBeenCalledWith('/sales', payload);
  });

  it('getSales usa /sales com page/limit default', async () => {
    mocked.get.mockResolvedValue({ data: { sales: [], total: 0 } });
    await saleService.getSales();
    expect(mocked.get).toHaveBeenCalledWith('/sales', { params: { page: 1, limit: 20 } });
  });

  it('searchSales remove undefined/null/empty e seta limit default 50', async () => {
    mocked.get.mockResolvedValue({ data: { sales: [], total: 0, page: 1, limit: 50, totalPages: 0 } });
    await saleService.searchSales({
      client_id: 5,
      barcode: '',
      sale_id: undefined,
      date_from: '2026-01-01',
    });
    expect(mocked.get).toHaveBeenCalledWith('/sales', {
      params: { client_id: 5, date_from: '2026-01-01', limit: 50 },
    });
  });

  it('searchSales respeita limit informado', async () => {
    mocked.get.mockResolvedValue({ data: {} });
    await saleService.searchSales({ limit: 10 });
    expect(mocked.get).toHaveBeenCalledWith('/sales', { params: { limit: 10 } });
  });

  it('getSaleById usa /sales/:id', async () => {
    mocked.get.mockResolvedValue({ data: { id: 5 } });
    await saleService.getSaleById(5);
    expect(mocked.get).toHaveBeenCalledWith('/sales/5');
  });
});
