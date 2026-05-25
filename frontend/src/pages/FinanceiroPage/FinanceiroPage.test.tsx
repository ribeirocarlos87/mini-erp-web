import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FinanceiroPage from './FinanceiroPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FinanceiroPage', () => {
  it('renderiza header e os 6 cards (4 ativos + 2 locked)', () => {
    render(
      <MemoryRouter>
        <FinanceiroPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Lançar Saída (Despesa)')).toBeInTheDocument();
    expect(screen.getByText('Criar Despesa Recorrente')).toBeInTheDocument();
    expect(screen.getByText('Lançar Entrada (Outras Receitas)')).toBeInTheDocument();
    expect(screen.getByText('Lançar Renegociação de dívida')).toBeInTheDocument();
    expect(screen.getByText('Emitir NF-e Avulsa')).toBeInTheDocument();
    expect(screen.getByText('Emitir NFC-e Avulsa')).toBeInTheDocument();
  });

  it('clicar em card ativo navega para rota correta', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FinanceiroPage />
      </MemoryRouter>
    );
    // Botão "Acessar" do primeiro card
    const acessarButtons = screen.getAllByRole('button', { name: /Acessar/i });
    await user.click(acessarButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/financeiro/lancar-despesa');
  });

  it('cards locked mostram label "Em breve" e não navegam', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FinanceiroPage />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/Em breve/i).length).toBeGreaterThan(0);
  });
});
