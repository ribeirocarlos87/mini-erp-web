import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { reportService } from './reportService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
  mocked.get.mockResolvedValue({ data: {} });
});

describe('reportService — 12 endpoints', () => {
  const cases: Array<[keyof typeof reportService, string]> = [
    ['salesReport', '/reports/sales'],
    ['commissionsReport', '/reports/commissions'],
    ['salesChannelsReport', '/reports/sales-channels'],
    ['dailyCashReport', '/reports/daily-cash'],
    ['paymentMethodsReport', '/reports/payment-methods'],
    ['cashFlowReport', '/reports/cash-flow'],
    ['productPerformanceReport', '/reports/product-performance'],
    ['salesByCategoryReport', '/reports/sales-by-category'],
    ['stockInventoryReport', '/reports/stock-inventory'],
    ['clientReport', '/reports/clients'],
    ['clientLifecycleReport', '/reports/client-lifecycle'],
    ['clientCreditsReport', '/reports/client-credits'],
  ];

  for (const [method, expectedPath] of cases) {
    it(`${method} chama GET ${expectedPath}`, async () => {
      await (reportService as any)[method]();
      expect(mocked.get).toHaveBeenCalledWith(expectedPath, { params: {} });
    });
  }

  it('serializa filtros: ignora undefined/null/empty e converte para string', async () => {
    await reportService.salesReport({ date_from: '2026-01-01', date_to: '', group_by: undefined, commission_rate: 10 });
    expect(mocked.get).toHaveBeenCalledWith('/reports/sales', {
      params: { date_from: '2026-01-01', commission_rate: '10' },
    });
  });
});
