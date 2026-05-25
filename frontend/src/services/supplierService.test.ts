import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { supplierService } from './supplierService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('supplierService', () => {
  it('getAll chama GET /suppliers', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await supplierService.getAll();
    expect(mocked.get).toHaveBeenCalledWith('/suppliers');
  });

  it('create envia POST /suppliers com data', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await supplierService.create({ name: 'X', email: 'x@y.com' });
    expect(mocked.post).toHaveBeenCalledWith('/suppliers', { name: 'X', email: 'x@y.com' });
  });

  it('delete usa DELETE /suppliers/:id', async () => {
    mocked.delete.mockResolvedValue({ data: {} });
    await supplierService.delete(7);
    expect(mocked.delete).toHaveBeenCalledWith('/suppliers/7');
  });
});
