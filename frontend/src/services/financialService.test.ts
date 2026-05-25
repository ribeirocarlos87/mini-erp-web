import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { financialService } from './financialService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('financialService — transações', () => {
  it('getTransactions sem filtros chama /financial/transactions?', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await financialService.getTransactions();
    expect(mocked.get).toHaveBeenCalledWith('/financial/transactions?');
  });

  it('getTransactions com filtros monta query string', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await financialService.getTransactions({ type: 'DESPESA', date_from: '2026-01-01', date_to: '2026-01-31' });
    const [url] = mocked.get.mock.calls[0];
    expect(url).toContain('type=DESPESA');
    expect(url).toContain('date_from=2026-01-01');
    expect(url).toContain('date_to=2026-01-31');
  });

  it('createTransaction envia body', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await financialService.createTransaction({ type: 'DESPESA', description: 'X', value: 10, date: '2026-01-01' });
    expect(mocked.post).toHaveBeenCalledWith('/financial/transactions', {
      type: 'DESPESA', description: 'X', value: 10, date: '2026-01-01',
    });
  });

  it('updateTransaction usa PUT /financial/transactions/:id', async () => {
    mocked.put.mockResolvedValue({ data: { id: 5 } });
    await financialService.updateTransaction(5, { description: 'novo' });
    expect(mocked.put).toHaveBeenCalledWith('/financial/transactions/5', { description: 'novo' });
  });

  it('deleteTransaction usa DELETE /financial/transactions/:id', async () => {
    mocked.delete.mockResolvedValue({ data: {} });
    await financialService.deleteTransaction(7);
    expect(mocked.delete).toHaveBeenCalledWith('/financial/transactions/7');
  });
});

describe('financialService — recorrentes', () => {
  it('getRecurringExpenses chama /financial/recurring', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await financialService.getRecurringExpenses();
    expect(mocked.get).toHaveBeenCalledWith('/financial/recurring');
  });

  it('createRecurringExpense usa POST /financial/recurring', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await financialService.createRecurringExpense({
      description: 'Aluguel',
      value: 2500,
      frequency: 'MENSAL',
      startDate: '2026-01-01',
    });
    expect(mocked.post).toHaveBeenCalledWith('/financial/recurring', expect.objectContaining({ frequency: 'MENSAL' }));
  });

  it('updateRecurringExpense usa PUT /financial/recurring/:id', async () => {
    mocked.put.mockResolvedValue({ data: { id: 1 } });
    await financialService.updateRecurringExpense(1, { active: false });
    expect(mocked.put).toHaveBeenCalledWith('/financial/recurring/1', { active: false });
  });

  it('deleteRecurringExpense usa DELETE /financial/recurring/:id', async () => {
    mocked.delete.mockResolvedValue({ data: {} });
    await financialService.deleteRecurringExpense(2);
    expect(mocked.delete).toHaveBeenCalledWith('/financial/recurring/2');
  });
});
