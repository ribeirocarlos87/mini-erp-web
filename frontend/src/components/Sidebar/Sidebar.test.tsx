import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarProvider } from '../../context/SidebarContext';
import { useAuthStore } from '../../store/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ user: { id: 1, email: 'a@b.com', name: 'A' }, token: 'tk', justLoggedIn: false, error: null, isLoading: false });
  // Garante desktop para os testes
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
});

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    </MemoryRouter>
  );

describe('Sidebar', () => {
  it('renderiza os 6 itens principais do menu', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('PDV')).toBeInTheDocument();
    expect(screen.getByText('Gestão de Estoque')).toBeInTheDocument();
    expect(screen.getByText('Vendas e Clientes')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
  });

  it('renderiza item Configurações e Sair no footer', () => {
    renderSidebar();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Sair')).toBeInTheDocument();
  });

  it('clicar em item de menu chama navigate com o path correspondente', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText('PDV'));
    expect(mockNavigate).toHaveBeenCalledWith('/pdv/produtos');
  });

  it('clicar em "Sair" chama logout e navega para /login', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText('Sair'));
    expect(useAuthStore.getState().user).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('clicar em "Configurações" navega para /configuracoes', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText('Configurações'));
    expect(mockNavigate).toHaveBeenCalledWith('/configuracoes');
  });
});
