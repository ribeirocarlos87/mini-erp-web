import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ColecoesPage from './ColecoesPage';
import { productCollectionService } from '../../services/productCollectionService';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/productCollectionService', () => ({
  productCollectionService: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (productCollectionService.getAll as any).mockResolvedValue([{ id: 1, name: 'Verão 2026' }]);
});

describe('ColecoesPage', () => {
  it('renderiza título "Coleções" e items vindos do service', async () => {
    render(
      <MemoryRouter>
        <ColecoesPage />
      </MemoryRouter>
    );
    expect(productCollectionService.getAll).toHaveBeenCalled();
    expect(await screen.findByText('Verão 2026')).toBeInTheDocument();
    expect(screen.getByText('Coleções', { selector: 'h1' })).toBeInTheDocument();
  });
});
