import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDVPage from './PDVPage';
import { usePDVStore } from '../../store/pdvStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/pdv/produtos' }),
  };
});

vi.mock('../PDVProducts', () => ({ default: () => <div data-testid="pdv-products" /> }));
vi.mock('../PDVClient', () => ({ default: () => <div data-testid="pdv-client" /> }));
vi.mock('../PDVPayment', () => ({ default: () => <div data-testid="pdv-payment" /> }));
vi.mock('../PDVFinalize', () => ({ default: () => <div data-testid="pdv-finalize" /> }));
vi.mock('../PDVReturns', () => ({ default: () => <div data-testid="pdv-returns" /> }));
vi.mock('../PDVSettings', () => ({ default: () => <div data-testid="pdv-settings" /> }));
vi.mock('../PDVSuccess', () => ({ default: () => <div data-testid="pdv-success" /> }));
vi.mock('../CadastrarClientePage', () => ({ default: () => <div data-testid="cadastrar-cliente" /> }));
vi.mock('../../components/PDVSidebar', () => ({ default: () => <div data-testid="pdv-sidebar" /> }));
vi.mock('../../components/PDVCart', () => ({ default: () => <div data-testid="pdv-cart" /> }));

beforeEach(() => {
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
});

describe('PDVPage', () => {
  it('renderiza PDVSidebar e conteúdo da seção produtos por default', async () => {
    render(
      <MemoryRouter initialEntries={['/pdv/produtos']}>
        <PDVPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('pdv-sidebar')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('pdv-products')).toBeInTheDocument());
  });

  it('renderiza overlay de loading inicialmente (2s)', () => {
    render(
      <MemoryRouter>
        <PDVPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Carregando PDV/i)).toBeInTheDocument();
  });

  it('em desktop, renderiza sidebar do carrinho', () => {
    render(
      <MemoryRouter>
        <PDVPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('pdv-cart')).toBeInTheDocument();
  });
});
