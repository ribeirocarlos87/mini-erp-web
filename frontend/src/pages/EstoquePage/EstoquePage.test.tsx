import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import EstoquePage from './EstoquePage';
import { productService } from '../../services/productService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

vi.mock('../../components/ProductForm', () => ({
  default: () => <div data-testid="product-form" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  (productService.getProducts as any).mockResolvedValue([
    { id: 1, name: 'Camiseta', code: 'CAM-001', quantityStock: 100, minStock: 5, category: 'Roupas' },
    { id: 2, name: 'Calça', code: 'CAL-001', quantityStock: 0, minStock: 3, category: 'Roupas' },
    { id: 3, name: 'Tênis', code: 'TEN-001', quantityStock: 3, minStock: 5, category: 'Calçados' },
  ]);
});

describe('EstoquePage', () => {
  it('chama getProducts ao montar e renderiza tabela', async () => {
    render(
      <MemoryRouter>
        <EstoquePage />
      </MemoryRouter>
    );
    expect(productService.getProducts).toHaveBeenCalled();
    expect(await screen.findByText('Camiseta')).toBeInTheDocument();
    expect(screen.getByText('Calça')).toBeInTheDocument();
    expect(screen.getByText('Tênis')).toBeInTheDocument();
  });

  it('busca filtra por nome ou código (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EstoquePage />
      </MemoryRouter>
    );
    await screen.findByText('Camiseta');
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'cam');
    await waitFor(() => {
      expect(screen.queryByText('Calça')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Camiseta')).toBeInTheDocument();
  });

  it('estado vazio: array vazio renderiza sem crash', async () => {
    (productService.getProducts as any).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <EstoquePage />
      </MemoryRouter>
    );
    await waitFor(() => expect(productService.getProducts).toHaveBeenCalled());
  });

  it('tolera shape de resposta { products } e array direto', async () => {
    (productService.getProducts as any).mockResolvedValue({ products: [{ id: 99, name: 'Shape Obj', code: 'X', quantityStock: 1 }] });
    render(
      <MemoryRouter>
        <EstoquePage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Shape Obj')).toBeInTheDocument();
  });
});
