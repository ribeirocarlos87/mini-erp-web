import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignupForm from './SignupForm';
import { authService } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/productService', () => ({
  authService: { login: vi.fn(), register: vi.fn() },
}));

const mockedRegister = vi.mocked(authService.register);

const renderForm = () =>
  render(
    <MemoryRouter>
      <SignupForm onSwitchToLogin={vi.fn()} />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ user: null, token: null, isLoading: false, error: null, justLoggedIn: false });
});

describe('SignupForm', () => {
  it('renderiza nome, email, senha, confirmar e botão "Criar conta"', () => {
    renderForm();
    expect(screen.getByLabelText('Nome Completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument();
  });

  it('mostra erro quando senhas não coincidem', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nome Completo'), 'João');
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.type(screen.getByLabelText('Confirmar'), 'outraSenha');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('mostra erro quando senha tem menos de 6 caracteres', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nome Completo'), 'A');
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'curt');
    await user.type(screen.getByLabelText('Confirmar'), 'curt');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('A senha deve ter no mínimo 6 caracteres')).toBeInTheDocument();
  });

  it('navega para /onboarding quando onboardingCompletedAt é null (novo usuário)', async () => {
    mockedRegister.mockResolvedValue({ user: { id: 1, email: 'a@b.com', name: 'A', onboardingCompletedAt: null }, token: 'tk' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nome Completo'), 'João');
    await user.type(screen.getByLabelText('Email'), 'joao@test.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.type(screen.getByLabelText('Confirmar'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() =>
      expect(mockedRegister).toHaveBeenCalledWith('João', 'joao@test.com', 'senha123')
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding'));
  });

  it('navega para /dashboard quando onboardingCompletedAt já está preenchido', async () => {
    mockedRegister.mockResolvedValue({ user: { id: 1, email: 'a@b.com', name: 'A', onboardingCompletedAt: '2026-01-01T00:00:00Z' }, token: 'tk' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nome Completo'), 'João');
    await user.type(screen.getByLabelText('Email'), 'joao@test.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.type(screen.getByLabelText('Confirmar'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('mostra "Este e-mail já está cadastrado" em 409', async () => {
    mockedRegister.mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nome Completo'), 'X');
    await user.type(screen.getByLabelText('Email'), 'dup@test.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.type(screen.getByLabelText('Confirmar'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Este e-mail já está cadastrado')).toBeInTheDocument();
  });

  it('clica em "Faça login" chama onSwitchToLogin', async () => {
    const onSwitch = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupForm onSwitchToLogin={onSwitch} />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Faça login' }));
    expect(onSwitch).toHaveBeenCalled();
  });
});
