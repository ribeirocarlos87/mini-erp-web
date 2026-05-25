import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { returnService } from './returnService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('returnService', () => {
  it('create envia POST /returns com payload', async () => {
    mocked.post.mockResolvedValue({ data: { saleId: 1, totalRefund: 100 } });
    const payload = {
      saleId: 1,
      items: [{ saleItemId: 10, quantity: 1 }],
      resolutionMethod: 'TROCA' as const,
    };
    const r = await returnService.create(payload);
    expect(mocked.post).toHaveBeenCalledWith('/returns', payload);
    expect(r.totalRefund).toBe(100);
  });

  it('getBySale usa /returns/by-sale/:id e desempacota data.returns', async () => {
    mocked.get.mockResolvedValue({ data: { returns: [{ id: 1, quantity: 1, productId: 5, product: { id: 5, name: 'P', code: 'C' } }] } });
    const r = await returnService.getBySale(99);
    expect(mocked.get).toHaveBeenCalledWith('/returns/by-sale/99');
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
  });
});
