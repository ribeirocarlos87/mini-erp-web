import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MarcasPage from './MarcasPage';
import { productBrandService } from '../../services/productBrandService';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/productBrandService', () => ({
  productBrandService: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (productBrandService.getAll as any).mockResolvedValue([{ id: 1, name: 'Nike' }]);
});

describe('MarcasPage', () => {
  it('renderiza título "Marcas" e items vindos do service', async () => {
    render(
      <MemoryRouter>
        <MarcasPage />
      </MemoryRouter>
    );
    expect(productBrandService.getAll).toHaveBeenCalled();
    expect(await screen.findByText('Nike')).toBeInTheDocument();
    expect(screen.getByText('Marcas', { selector: 'h1' })).toBeInTheDocument();
  });
});
