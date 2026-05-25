import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { clientService } from './clientService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('clientService', () => {
  it('getClients usa /clients com page e limit', async () => {
    mocked.get.mockResolvedValue({ data: { clients: [], total: 0 } });
    await clientService.getClients(3, 50);
    expect(mocked.get).toHaveBeenCalledWith('/clients', { params: { page: 3, limit: 50 } });
  });

  it('getClient usa /clients/:id', async () => {
    mocked.get.mockResolvedValue({ data: { id: 1 } });
    await clientService.getClient(1);
    expect(mocked.get).toHaveBeenCalledWith('/clients/1');
  });

  it('createClient envia body', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await clientService.createClient({ name: 'X' });
    expect(mocked.post).toHaveBeenCalledWith('/clients', { name: 'X' });
  });

  it('updateClient usa /clients/:id', async () => {
    mocked.put.mockResolvedValue({ data: { id: 1 } });
    await clientService.updateClient(1, { name: 'Y' });
    expect(mocked.put).toHaveBeenCalledWith('/clients/1', { name: 'Y' });
  });

  it('deleteClient usa /clients/:id', async () => {
    mocked.delete.mockResolvedValue({ data: { message: 'ok' } });
    await clientService.deleteClient(9);
    expect(mocked.delete).toHaveBeenCalledWith('/clients/9');
  });

  it('getClientPurchases usa /clients/:id/purchases com page e limit', async () => {
    mocked.get.mockResolvedValue({ data: { sales: [], total: 0, stats: {} } });
    await clientService.getClientPurchases(7, 2, 25);
    expect(mocked.get).toHaveBeenCalledWith('/clients/7/purchases', { params: { page: 2, limit: 25 } });
  });
});
