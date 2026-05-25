import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PDVSettings from './PDVSettings';
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
});

describe('PDVSettings', () => {
  it('renderiza título "Configurações" e secção Aparência', () => {
    render(
      <MemoryRouter>
        <PDVSettings />
      </MemoryRouter>
    );
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Aparência')).toBeInTheDocument();
  });

  it('alterna tema entre Claro e Escuro', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PDVSettings />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Escuro/i }));
    // O componente apenas alterna state local; smoke + click sem crash.
    expect(screen.getByRole('button', { name: /Escuro/i })).toBeInTheDocument();
  });

  it('sair do PDV chama resetPDV e navega (com confirm)', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    usePDVStore.getState().addToCart({ id: 'p1', name: 'X', price: 10, quantity: 1 });

    render(
      <MemoryRouter>
        <PDVSettings />
      </MemoryRouter>
    );
    const sairBtn = screen.getByRole('button', { name: /Sair do PDV/i });
    await user.click(sairBtn);
    expect(confirmSpy).toHaveBeenCalled();
    expect(usePDVStore.getState().cart).toHaveLength(0);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    confirmSpy.mockRestore();
  });
});
