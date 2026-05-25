import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SalesAndClientsPage from './SalesAndClientsPage';
import { clientService } from '../../services/clientService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/clientService', () => ({
  clientService: {
    getClients: vi.fn().mockResolvedValue({ clients: [], total: 0 }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (clientService.getClients as any).mockResolvedValue({ clients: [], total: 0 });
});

describe('SalesAndClientsPage', () => {
  it('renderiza header e duas seções (Gestão de Vendas, Controle de Clientes)', () => {
    render(
      <MemoryRouter>
        <SalesAndClientsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Vendas e Clientes')).toBeInTheDocument();
    expect(screen.getByText('Gestão de Vendas')).toBeInTheDocument();
    expect(screen.getByText('Controle de Clientes')).toBeInTheDocument();
  });

  it('carrega contagem de clientes ao montar', async () => {
    (clientService.getClients as any).mockResolvedValue({ clients: [{ id: 1 }, { id: 2 }], total: 2 });
    render(
      <MemoryRouter>
        <SalesAndClientsPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(clientService.getClients).toHaveBeenCalledWith(1, 10000));
    expect(await screen.findByText(/2 clientes cadastrados/i)).toBeInTheDocument();
  });

  it('cliques nos cards navegam para as rotas corretas', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SalesAndClientsPage />
      </MemoryRouter>
    );

    await user.click(screen.getByText('Lançar Venda'));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/lancar-venda');

    await user.click(screen.getByText('Lançar Devolução de Venda'));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/lancar-devolucao');

    await user.click(screen.getByText('Cadastrar Cliente'));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/cadastrar-cliente');

    await user.click(screen.getByText('Lista de Clientes'));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/lista-clientes');
  });
});
