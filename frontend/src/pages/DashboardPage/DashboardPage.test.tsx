import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { useAuthStore } from '../../store/authStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/productService', () => ({
  productService: {
    getProducts: vi.fn().mockResolvedValue([
      { id: 1, name: 'P1', quantityStock: 10, minStock: 5, priceSale: '100' },
      { id: 2, name: 'P2', quantityStock: 2, minStock: 5, priceSale: '50' }, // low stock
    ]),
  },
}));

vi.mock('../../services/dashboardService', () => ({
  dashboardService: {
    getSalesToday: vi.fn().mockResolvedValue({ total: 500, count: 3 }),
    getSalesWeek: vi.fn().mockResolvedValue({ total: 3500, count: 20 }),
    getRecentActivity: vi.fn().mockResolvedValue([
      { type: 'sale', label: 'Venda realizada', detail: 'R$ 100,00', date: new Date().toISOString() },
    ]),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({
    user: { id: 1, email: 'a@b.com', name: 'Carlos' },
    token: 'tk',
    justLoggedIn: false,
    error: null,
    isLoading: false,
  });
});

describe('DashboardPage', () => {
  it('mostra estado de loading antes de carregar', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Carregando dashboard...')).toBeInTheDocument();
  });

  it('renderiza cards de stats com valores formatados em BRL após carga', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText('Carregando dashboard...')).not.toBeInTheDocument());

    expect(screen.getByText('Vendas do Dia')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?500,00/)).toBeInTheDocument();
    expect(screen.getByText('Valor em Estoque')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?1\.100,00/)).toBeInTheDocument(); // 100*10 + 50*2
    expect(screen.getByText('Produtos em Estoque')).toBeInTheDocument();
    expect(screen.getByText('Vendas na Semana')).toBeInTheDocument();
  });

  it('cumprimenta o usuário pelo nome do authStore', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByText('Carregando dashboard...')).not.toBeInTheDocument());
    expect(screen.getByText(/Olá, Carlos/)).toBeInTheDocument();
  });

  it('lista produtos com estoque baixo', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByText('Carregando dashboard...')).not.toBeInTheDocument());
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('2 unidades')).toBeInTheDocument();
    expect(screen.queryByText('P1')).not.toBeInTheDocument(); // não está em estoque baixo
  });

  it('mostra atividades recentes na seção Atividades Recentes', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByText('Carregando dashboard...')).not.toBeInTheDocument());
    expect(screen.getByText('Venda realizada')).toBeInTheDocument();
  });
});
