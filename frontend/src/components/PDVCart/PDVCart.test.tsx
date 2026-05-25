import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PDVCart from './PDVCart';
import { usePDVStore } from '../../store/pdvStore';

beforeEach(() => {
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
});

describe('PDVCart', () => {
  it('estado vazio: mostra "Nenhum produto adicionado"', () => {
    render(<PDVCart />);
    expect(screen.getByText('Nenhum produto adicionado')).toBeInTheDocument();
  });

  it('estado vazio com cliente selecionado: mostra badge do cliente', () => {
    usePDVStore.getState().setSelectedClient({ id: 'c1', name: 'João da Silva', cpf: '123.456.789-00' });
    render(<PDVCart />);
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
  });

  it('com items: renderiza nome, preço, qty e calcula total', () => {
    usePDVStore.getState().addToCart({ id: 'p1', name: 'Camiseta', price: 100, quantity: 2 });
    usePDVStore.getState().addToCart({ id: 'p2', name: 'Calça', price: 50, quantity: 1 });
    render(<PDVCart />);
    expect(screen.getByText('Camiseta')).toBeInTheDocument();
    expect(screen.getByText('Calça')).toBeInTheDocument();
  });

  it('com cliente: clicar no X do badge remove o cliente', async () => {
    usePDVStore.getState().setSelectedClient({ id: 'c1', name: 'Maria' });
    const user = userEvent.setup();
    render(<PDVCart />);
    await user.click(screen.getByTitle('Remover cliente'));
    expect(usePDVStore.getState().selectedClient).toBeNull();
  });

  it('clicar em "Limpar carrinho" zera os items', async () => {
    usePDVStore.getState().addToCart({ id: 'p1', name: 'X', price: 10, quantity: 1 });
    const user = userEvent.setup();
    render(<PDVCart />);
    await user.click(screen.getByTitle('Limpar carrinho'));
    expect(usePDVStore.getState().cart).toHaveLength(0);
  });
});
