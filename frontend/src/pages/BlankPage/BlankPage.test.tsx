import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlankPage from './BlankPage';

describe('BlankPage', () => {
  it('renderiza title recebido como prop', () => {
    render(<BlankPage title="Lançar Venda" />);
    expect(screen.getByRole('heading', { name: 'Lançar Venda' })).toBeInTheDocument();
  });

  it('renderiza mensagem padrão de "em breve"', () => {
    render(<BlankPage title="X" />);
    expect(screen.getByText('Esta página será desenvolvida em breve.')).toBeInTheDocument();
  });
});
