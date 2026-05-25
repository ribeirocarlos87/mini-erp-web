import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { productBrandService } from './productBrandService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('productBrandService', () => {
  it('getAll chama GET /product-brands', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await productBrandService.getAll();
    expect(mocked.get).toHaveBeenCalledWith('/product-brands');
  });

  it('create envia { name } via POST', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1, name: 'Nike' } });
    await productBrandService.create('Nike');
    expect(mocked.post).toHaveBeenCalledWith('/product-brands', { name: 'Nike' });
  });

  it('delete usa DELETE /product-brands/:id', async () => {
    mocked.delete.mockResolvedValue({ data: {} });
    await productBrandService.delete(8);
    expect(mocked.delete).toHaveBeenCalledWith('/product-brands/8');
  });
});
