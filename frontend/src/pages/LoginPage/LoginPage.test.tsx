import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/productService', () => ({
  authService: { login: vi.fn(), register: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
});

describe('LoginPage', () => {
  it('renderiza branding + LoginForm inicialmente', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Mini ERP - WEB')).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
  });

  it('troca para SignupForm quando clica em "Cadastre-se"', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Cadastre-se' }));
    expect(screen.getByText('Criar conta', { selector: 'h2' })).toBeInTheDocument();
  });
});
