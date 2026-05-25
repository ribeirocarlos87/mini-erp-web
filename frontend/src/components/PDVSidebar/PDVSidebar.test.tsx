import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDVSidebar from './PDVSidebar';
import { usePDVStore } from '../../store/pdvStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
  // Desktop por default
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
});

const renderSidebar = (activeSection: any = 'produtos') =>
  render(
    <MemoryRouter>
      <PDVSidebar activeSection={activeSection} />
    </MemoryRouter>
  );

describe('PDVSidebar', () => {
  it('renderiza as 4 etapas do fluxo (Produtos, Cliente, Pagamento, Finalizar)', () => {
    renderSidebar();
    expect(screen.getByText('Produtos')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Pagamento')).toBeInTheDocument();
    expect(screen.getByText('Finalizar')).toBeInTheDocument();
  });

  it('renderiza seções extras (Devoluções, Config.)', () => {
    renderSidebar();
    expect(screen.getByText('Devoluções')).toBeInTheDocument();
    expect(screen.getByText('Config.')).toBeInTheDocument();
  });

  it('etapa Produtos marcada como completa quando há items no carrinho', () => {
    usePDVStore.getState().addToCart({ id: 'p1', name: 'X', price: 10, quantity: 1 });
    const { container } = renderSidebar();
    const produtoBtn = screen.getByText('Produtos').closest('button');
    expect(produtoBtn?.querySelector('[data-status="complete"]')).toBeTruthy();
  });

  it('etapa Cliente marcada como completa quando cliente está selecionado', () => {
    usePDVStore.getState().setSelectedClient({ id: 'c1', name: 'X' });
    renderSidebar();
    const clienteBtn = screen.getByText('Cliente').closest('button');
    expect(clienteBtn?.querySelector('[data-status="complete"]')).toBeTruthy();
  });

  it('etapa Pagamento marcada como pendente quando totals não batem', () => {
    usePDVStore.getState().addToCart({ id: 'p1', name: 'X', price: 100, quantity: 1 });
    usePDVStore.getState().addPayment({ id: 'pay1', method: 'cash', label: 'Dinheiro', amount: 50 });
    renderSidebar();
    const pagamentoBtn = screen.getByText('Pagamento').closest('button');
    expect(pagamentoBtn?.querySelector('[data-status="pending"]')).toBeTruthy();
  });

  it('etapa Finalizar completa só quando TODAS as anteriores estão prontas', () => {
    usePDVStore.getState().addToCart({ id: 'p1', name: 'X', price: 100, quantity: 1 });
    usePDVStore.getState().setSelectedClient({ id: 'c1', name: 'X' });
    usePDVStore.getState().addPayment({ id: 'pay1', method: 'cash', label: 'Dinheiro', amount: 100 });
    renderSidebar();
    const finalizarBtn = screen.getByText('Finalizar').closest('button');
    expect(finalizarBtn?.querySelector('[data-status="complete"]')).toBeTruthy();
  });
});
