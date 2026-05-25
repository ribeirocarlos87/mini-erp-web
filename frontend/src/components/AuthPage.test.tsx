import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../services/productService', () => ({
  authService: { login: vi.fn(), register: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
});

describe('AuthPage', () => {
  it('inicia na aba "Entrar" com LoginForm visível', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
    expect(screen.queryByText('Criar conta', { selector: 'h2' })).not.toBeInTheDocument();
  });

  it('clicar na aba "Criar conta" troca para SignupForm', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByText('Criar conta', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByText('Bem-vindo de volta')).not.toBeInTheDocument();
  });

  it('renderiza painel esquerdo com hero text e stats', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Gerencie seus produtos com precisão.')).toBeInTheDocument();
    expect(screen.getByText('Simplificadas')).toBeInTheDocument();
    expect(screen.getByText('4.9★')).toBeInTheDocument();
  });

  it('renderiza ano corrente no footer', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    const ano = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${ano}`))).toBeInTheDocument();
  });
});
