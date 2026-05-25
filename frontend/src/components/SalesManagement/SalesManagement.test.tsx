import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SalesManagement from './SalesManagement';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SalesManagement', () => {
  it('renderiza título e botões de Lançar Venda e Devolução', () => {
    render(
      <MemoryRouter>
        <SalesManagement />
      </MemoryRouter>
    );
    expect(screen.getByText('Gestão de Vendas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lançar Venda/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lançar Devolução de Venda/i })).toBeInTheDocument();
  });

  it('"Lançar Venda" navega para /vendas-e-clientes/lancar-venda', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SalesManagement />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Lançar Venda/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/lancar-venda');
  });

  it('"Lançar Devolução" navega para /vendas-e-clientes/lancar-devolucao', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SalesManagement />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Lançar Devolução de Venda/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/vendas-e-clientes/lancar-devolucao');
  });
});
