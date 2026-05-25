import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ListaClientesPage from './ListaClientesPage';
import { clientService } from '../../services/clientService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/clientService', () => ({
  clientService: {
    getClients: vi.fn(),
    deleteClient: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (clientService.getClients as any).mockResolvedValue({
    clients: [
      { id: 1, name: 'João Silva', cpfCnpj: '12345678900', email: 'joao@test.com', phone: '11999998888', creditBalance: 100 },
      { id: 2, name: 'Maria Souza', cpfCnpj: '98765432100', email: 'maria@test.com' },
    ],
    total: 2,
  });
});

describe('ListaClientesPage', () => {
  it('carrega clientes via getClients e renderiza tabela', async () => {
    render(
      <MemoryRouter>
        <ListaClientesPage />
      </MemoryRouter>
    );
    expect(clientService.getClients).toHaveBeenCalledWith(1, 10000);
    expect(await screen.findByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });

  it('formata CPF na exibição', async () => {
    render(
      <MemoryRouter>
        <ListaClientesPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('123.456.789-00')).toBeInTheDocument();
  });

  it('busca filtra por nome, CPF ou email', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ListaClientesPage />
      </MemoryRouter>
    );
    await screen.findByText('João Silva');
    await user.type(screen.getByPlaceholderText(/buscar/i), 'maria');
    await waitFor(() => {
      expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });
});
