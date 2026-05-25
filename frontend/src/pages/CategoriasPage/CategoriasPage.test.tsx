import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CategoriasPage from './CategoriasPage';
import { productCategoryService } from '../../services/productCategoryService';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/productCategoryService', () => ({
  productCategoryService: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (productCategoryService.getAll as any).mockResolvedValue([{ id: 1, name: 'Camisetas' }]);
});

describe('CategoriasPage', () => {
  it('chama getAll ao montar e renderiza items', async () => {
    render(
      <MemoryRouter>
        <CategoriasPage />
      </MemoryRouter>
    );
    expect(productCategoryService.getAll).toHaveBeenCalled();
    expect(await screen.findByText('Camisetas')).toBeInTheDocument();
    expect(screen.getByText('Categorias', { selector: 'h1' })).toBeInTheDocument();
  });

  it('handleCreate adiciona item à lista', async () => {
    const created = { id: 2, name: 'Calças' };
    (productCategoryService.create as any).mockResolvedValue(created);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CategoriasPage />
      </MemoryRouter>
    );

    await screen.findByText('Camisetas');
    await user.click(screen.getByRole('button', { name: /Nova Categoria/i }));
    await user.type(screen.getByPlaceholderText('Nome da categoria...'), 'Calças');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(productCategoryService.create).toHaveBeenCalledWith('Calças'));
    expect(await screen.findByText('Calças')).toBeInTheDocument();
  });
});
