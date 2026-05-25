import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDVReturns from './PDVReturns';
import { usePDVStore } from '../../store/pdvStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/saleService', () => ({
  saleService: { searchSales: vi.fn().mockResolvedValue({ sales: [], total: 0 }) },
}));
vi.mock('../../services/returnService', () => ({
  returnService: { create: vi.fn() },
}));

beforeEach(() => {
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
});

describe('PDVReturns', () => {
  it('renderiza sem crash (smoke)', () => {
    const { container } = render(
      <MemoryRouter>
        <PDVReturns />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
