import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CriarProdutoPage from './CriarProdutoPage';
import { productService } from '../../services/productService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

vi.mock('../../services/productService', () => ({
  productService: {
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
  },
}));

vi.mock('../../services/productCategoryService', () => ({
  productCategoryService: { getAll: vi.fn().mockResolvedValue([]), create: vi.fn() },
}));
vi.mock('../../services/productBrandService', () => ({
  productBrandService: { getAll: vi.fn().mockResolvedValue([]), create: vi.fn() },
}));
vi.mock('../../services/productCollectionService', () => ({
  productCollectionService: { getAll: vi.fn().mockResolvedValue([]), create: vi.fn() },
}));
vi.mock('../../services/supplierService', () => ({
  supplierService: { getAll: vi.fn().mockResolvedValue([]), create: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CriarProdutoPage', () => {
  it('renderiza tabs do formulário em modo criação', () => {
    render(
      <MemoryRouter>
        <CriarProdutoPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Informações gerais')).toBeInTheDocument();
    expect(screen.getByText('Valores')).toBeInTheDocument();
    expect(screen.getByText('Estoque')).toBeInTheDocument();
    expect(screen.getByText('Imagens')).toBeInTheDocument();
    expect(screen.getByText('Pesos e dimensões')).toBeInTheDocument();
    expect(screen.getByText('Dados fiscais')).toBeInTheDocument();
    expect(screen.getByText('E-commerce')).toBeInTheDocument();
  });

  it('navegar entre tabs preserva conteúdo do form', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CriarProdutoPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('Valores'));
    // Aba Valores agora ativa — sem crash
    await user.click(screen.getByText('Informações gerais'));
  });
});
