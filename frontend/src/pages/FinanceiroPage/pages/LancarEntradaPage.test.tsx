import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LancarEntradaPage from './LancarEntradaPage';
import { financialService } from '../../../services/financialService';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/financialService', () => ({
  financialService: {
    getTransactions: vi.fn().mockResolvedValue([]),
    createTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LancarEntradaPage', () => {
  it('chama getTransactions com type=RECEITA ao montar', () => {
    render(
      <MemoryRouter>
        <LancarEntradaPage />
      </MemoryRouter>
    );
    expect(financialService.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RECEITA' })
    );
  });
});
