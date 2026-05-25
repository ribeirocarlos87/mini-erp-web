import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RenegociacaoDividaPage from './RenegociacaoDividaPage';

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

describe('RenegociacaoDividaPage', () => {
  it('renderiza sem crash (smoke)', () => {
    const { container } = render(
      <MemoryRouter>
        <RenegociacaoDividaPage />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
