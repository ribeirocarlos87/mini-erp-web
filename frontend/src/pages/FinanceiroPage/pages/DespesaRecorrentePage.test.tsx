import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DespesaRecorrentePage from './DespesaRecorrentePage';
import { financialService } from '../../../services/financialService';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/financialService', () => ({
  financialService: {
    getRecurringExpenses: vi.fn().mockResolvedValue([]),
    createRecurringExpense: vi.fn(),
    updateRecurringExpense: vi.fn(),
    deleteRecurringExpense: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DespesaRecorrentePage', () => {
  it('chama getRecurringExpenses ao montar', async () => {
    render(
      <MemoryRouter>
        <DespesaRecorrentePage />
      </MemoryRouter>
    );
    expect(financialService.getRecurringExpenses).toHaveBeenCalled();
  });
});
