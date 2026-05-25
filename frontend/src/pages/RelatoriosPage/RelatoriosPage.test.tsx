import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RelatoriosPage from './RelatoriosPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../assets/icons', () => ({
  iconBarChart: '', iconMoneyBag: '', iconPackage: '', iconPeople: '',
  iconShoppingCart: '', iconTrophy: '', iconSatellite: '', iconBank: '',
  iconCreditCard: '', iconChartIncreasing: '', iconMagnifyingGlass: '',
  iconCardIndexDividers: '', iconBalanceScale: '', iconIdentificationCard: '',
  iconBeatingHeart: '', iconMoneyWings: '',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RelatoriosPage', () => {
  it('renderiza header e 4 categorias de relatórios', () => {
    render(
      <MemoryRouter>
        <RelatoriosPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    expect(screen.getByText('Relatório de Vendas')).toBeInTheDocument();
    expect(screen.getByText('Relatório do Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Relatório do Estoque')).toBeInTheDocument();
    expect(screen.getByText('Relatório de Clientes')).toBeInTheDocument();
  });

  it('clicar em uma categoria expande os sub-relatórios', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelatoriosPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('Relatório de Vendas'));
    expect(await screen.findByText('Comissões')).toBeInTheDocument();
    expect(screen.getByText('Canais de Vendas')).toBeInTheDocument();
  });

  it('clicar em "Acessar relatório" navega para rota correta', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelatoriosPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText('Relatório de Vendas'));
    const acessarBtns = await screen.findAllByRole('button', { name: /Acessar relatório/i });
    await user.click(acessarBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/relatorios/vendas');
  });
});
