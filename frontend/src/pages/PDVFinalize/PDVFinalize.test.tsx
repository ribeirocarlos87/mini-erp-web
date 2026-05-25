import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDVFinalize from './PDVFinalize';
import { usePDVStore } from '../../store/pdvStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/saleService', () => ({
  saleService: { createSale: vi.fn() },
}));

beforeEach(() => {
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
});

describe('PDVFinalize', () => {
  it('renderiza sem crash (smoke)', () => {
    const { container } = render(
      <MemoryRouter>
        <PDVFinalize />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
