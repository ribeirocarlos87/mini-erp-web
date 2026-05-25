import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { productCategoryService } from './productCategoryService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('productCategoryService', () => {
  it('getAll chama GET /product-categories', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await productCategoryService.getAll();
    expect(mocked.get).toHaveBeenCalledWith('/product-categories');
  });

  it('create envia { name } via POST', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1, name: 'X' } });
    await productCategoryService.create('Camisetas');
    expect(mocked.post).toHaveBeenCalledWith('/product-categories', { name: 'Camisetas' });
  });

  it('delete usa DELETE /product-categories/:id', async () => {
    mocked.delete.mockResolvedValue({ data: {} });
    await productCategoryService.delete(5);
    expect(mocked.delete).toHaveBeenCalledWith('/product-categories/5');
  });
});
