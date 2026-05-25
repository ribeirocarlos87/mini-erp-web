import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { dashboardService } from './dashboardService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dashboardService', () => {
  it('getStats retorna data quando sucesso', async () => {
    mocked.get.mockResolvedValue({ data: { x: 1 } });
    const r = await dashboardService.getStats();
    expect(r).toEqual({ x: 1 });
    expect(mocked.get).toHaveBeenCalledWith('/dashboard/stats');
  });

  it('getStats retorna null em erro (silencia)', async () => {
    mocked.get.mockRejectedValue(new Error('500'));
    const r = await dashboardService.getStats();
    expect(r).toBeNull();
  });

  it('getSalesToday soma totalValue de cada venda e retorna { total, count }', async () => {
    mocked.get.mockResolvedValue({
      data: { sales: [{ totalValue: '100.50' }, { totalValue: '49.50' }] },
    });
    const r = await dashboardService.getSalesToday();
    expect(r.total).toBe(150);
    expect(r.count).toBe(2);
  });

  it('getSalesToday aceita array direto na response', async () => {
    mocked.get.mockResolvedValue({ data: [{ totalValue: '50' }] });
    const r = await dashboardService.getSalesToday();
    expect(r.count).toBe(1);
    expect(r.total).toBe(50);
  });

  it('getSalesToday retorna zeros em erro', async () => {
    mocked.get.mockRejectedValue(new Error('500'));
    const r = await dashboardService.getSalesToday();
    expect(r).toEqual({ total: 0, count: 0 });
  });

  it('getSalesWeek usa range de 7 dias', async () => {
    mocked.get.mockResolvedValue({ data: { sales: [] } });
    await dashboardService.getSalesWeek();
    const params = (mocked.get.mock.calls[0][1] as any).params;
    expect(params.date_from).toBeDefined();
    expect(params.date_to).toBeDefined();
    const from = new Date(params.date_from);
    const to = new Date(params.date_to);
    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('getRecentActivity mescla vendas + entries ordenadas por data desc', async () => {
    const dataOlder = '2026-01-01T10:00:00Z';
    const dataNewer = '2026-01-02T10:00:00Z';
    mocked.get.mockImplementation((url: string) => {
      if (url === '/sales') {
        return Promise.resolve({
          data: { sales: [{ totalValue: '100', createdAt: dataOlder }] },
        });
      }
      if (url === '/entries') {
        return Promise.resolve({
          data: { entries: [{ description: 'Compra', value: 50, createdAt: dataNewer }] },
        });
      }
      return Promise.reject(new Error('?'));
    });

    const r = await dashboardService.getRecentActivity();
    expect(r).toHaveLength(2);
    expect(r[0].type).toBe('entry'); // mais recente primeiro
    expect(r[1].type).toBe('sale');
  });

  it('getRecentActivity retorna [] em erro completo', async () => {
    mocked.get.mockRejectedValue(new Error('boom'));
    const r = await dashboardService.getRecentActivity();
    // Promise.allSettled NÃO rejeita a função; ela só processa os fulfilled.
    // Como ambos rejeitam, activities fica [] (não cai no catch externo).
    expect(r).toEqual([]);
  });
});
