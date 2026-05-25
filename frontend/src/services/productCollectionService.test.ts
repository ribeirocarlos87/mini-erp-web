import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { productCollectionService } from './productCollectionService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('productCollectionService', () => {
  it('getAll chama GET /product-collections', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await productCollectionService.getAll();
    expect(mocked.get).toHaveBeenCalledWith('/product-collections');
  });

  it('create envia { name } via POST', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1, name: 'Verão' } });
    await productCollectionService.create('Verão 2026');
    expect(mocked.post).toHaveBeenCalledWith('/product-collections', { name: 'Verão 2026' });
  });

  it('delete usa DELETE /product-collections/:id', async () => {
    mocked.delete.mockResolvedValue({ data: {} });
    await productCollectionService.delete(11);
    expect(mocked.delete).toHaveBeenCalledWith('/product-collections/11');
  });
});
