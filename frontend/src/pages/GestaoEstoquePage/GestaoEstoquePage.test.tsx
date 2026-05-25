import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GestaoEstoquePage from './GestaoEstoquePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/productService', () => ({
  productService: {
    getProducts: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]),
  },
}));
vi.mock('../../services/productCategoryService', () => ({
  productCategoryService: { getAll: vi.fn().mockResolvedValue([{ id: 1 }]) },
}));
vi.mock('../../services/productBrandService', () => ({
  productBrandService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/productCollectionService', () => ({
  productCollectionService: { getAll: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) },
}));
vi.mock('../../services/supplierService', () => ({
  supplierService: { getAll: vi.fn().mockResolvedValue([{ id: 1 }]) },
}));
vi.mock('../../assets/icons', () => ({
  iconPackage: '', iconMagnifyingGlass: '', iconCardIndexDividers: '', iconLabel: '',
  iconBooks: '', iconDepartmentStore: '', iconDeliveryTruck: '', iconInboxTray: '',
  iconBalanceScale: '', iconArtistPalette: '', iconControlKnobs: '', iconIdentificationCard: '',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GestaoEstoquePage', () => {
  it('renderiza header e seções principais', () => {
    render(
      <MemoryRouter>
        <GestaoEstoquePage />
      </MemoryRouter>
    );
    expect(screen.getByText('Gestão de Estoque')).toBeInTheDocument();
    expect(screen.getByText('Gestão de Produtos')).toBeInTheDocument();
    expect(screen.getByText('Organização')).toBeInTheDocument();
    expect(screen.getByText('Operação')).toBeInTheDocument();
  });

  it('carrega contagens de cada entidade ao montar', async () => {
    render(
      <MemoryRouter>
        <GestaoEstoquePage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/3 produtos cadastrados/i)).toBeInTheDocument();
    expect(await screen.findByText(/1 cadastrada/i)).toBeInTheDocument();
    expect(await screen.findByText(/2 cadastradas/i)).toBeInTheDocument();
  });

  it('clicar em "Cadastrar Produtos" navega para /estoque/criar-produto', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GestaoEstoquePage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('Cadastrar Produtos'));
    expect(mockNavigate).toHaveBeenCalledWith('/estoque/criar-produto');
  });

  it('clicar em "Categorias" navega para /gestao-estoque/categorias', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GestaoEstoquePage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('Categorias'));
    expect(mockNavigate).toHaveBeenCalledWith('/gestao-estoque/categorias');
  });
});
