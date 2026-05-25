import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ClientsControl from './ClientsControl';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ClientsControl', () => {
  it('renderiza título e dois botões de ação', () => {
    render(
      <MemoryRouter>
        <ClientsControl />
      </MemoryRouter>
    );
    expect(screen.getByText('Controle de Clientes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadastrar Cliente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lista de Clientes/i })).toBeInTheDocument();
  });

  it('clicar em "Cadastrar Cliente" navega para a rota correta', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ClientsControl />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Cadastrar Cliente/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/cadastrar-cliente');
  });

  it('clicar em "Lista de Clientes" navega para a rota correta', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ClientsControl />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Lista de Clientes/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/lista-clientes');
  });
});
