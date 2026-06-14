import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from './LoginForm';
import { authService } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/productService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const mockedLogin = vi.mocked(authService.login);
const mockedForgotPassword = vi.mocked(authService.forgotPassword);
const mockedResetPassword = vi.mocked(authService.resetPassword);

const renderForm = () =>
  render(
    <MemoryRouter>
      <LoginForm onSwitchToSignup={vi.fn()} />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ user: null, token: null, isLoading: false, error: null, justLoggedIn: false });
});

describe('LoginForm', () => {
  it('renderiza email, senha e botão "Entrar"', () => {
    renderForm();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('mostra erro quando campos estão vazios', async () => {
    const user = userEvent.setup();
    renderForm();
    // O input tem required, então click submit não dispara; usamos fireEvent diretamente no form.
    const form = screen.getByRole('button', { name: 'Entrar' }).closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText('Por favor, preencha e-mail e senha')).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('chama authService.login e navega para /dashboard em sucesso', async () => {
    mockedLogin.mockResolvedValue({ user: { id: 1, email: 'a@b.com', name: 'A' }, token: 'tk' });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(mockedLogin).toHaveBeenCalledWith('a@b.com', 'senha123'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
    expect(useAuthStore.getState().user?.id).toBe(1);
  });

  it('exibe "E-mail ou senha incorretos" em erro 401', async () => {
    mockedLogin.mockRejectedValue({ response: { status: 401 } });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('E-mail ou senha incorretos')).toBeInTheDocument();
  });

  it('exibe "Erro de conexão" em Network Error', async () => {
    mockedLogin.mockRejectedValue({ message: 'Network Error' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'x');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Erro de conexão. Verifique sua internet')).toBeInTheDocument();
  });

  it('toggle de senha alterna entre type="password" e type="text"', async () => {
    const user = userEvent.setup();
    renderForm();
    const senha = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(senha.type).toBe('password');
    await user.click(screen.getByLabelText('Mostrar senha'));
    expect(senha.type).toBe('text');
  });

  it('clica no link "Cadastre-se" chama onSwitchToSignup', async () => {
    const onSwitch = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginForm onSwitchToSignup={onSwitch} />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Cadastre-se' }));
    expect(onSwitch).toHaveBeenCalled();
  });
});

describe('LoginForm — view: forgot', () => {
  it('clicar em "Esqueceu?" troca para a view forgot', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Esqueceu?' }));
    expect(screen.getByRole('heading', { name: 'Recuperar senha' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seu e-mail')).toBeInTheDocument();
  });

  it('submeter email chama forgotPassword e mostra confirmação', async () => {
    mockedForgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Esqueceu?' }));
    await user.type(screen.getByLabelText('Seu e-mail'), 'foo@bar.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    await waitFor(() =>
      expect(screen.getByText(/link enviado/i)).toBeInTheDocument()
    );
    expect(mockedForgotPassword).toHaveBeenCalledWith('foo@bar.com');
  });

  it('botão "Voltar" retorna para a view login', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Esqueceu?' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });
});

describe('LoginForm — view: reset', () => {
  const renderReset = (token = 'valid.reset.token') =>
    render(
      <MemoryRouter>
        <LoginForm
          onSwitchToSignup={vi.fn()}
          resetToken={token}
          onResetSuccess={vi.fn()}
        />
      </MemoryRouter>
    );

  it('renderiza view reset quando resetToken prop é fornecido', () => {
    renderReset();
    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });

  it('mostra hint inline quando as senhas não coincidem', async () => {
    const user = userEvent.setup();
    renderReset();
    await user.type(screen.getByLabelText('Nova senha'), 'senha123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'diferente');
    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it('chama resetPassword e onResetSuccess em sucesso', async () => {
    mockedResetPassword.mockResolvedValue(undefined);
    const onResetSuccess = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginForm
          onSwitchToSignup={vi.fn()}
          resetToken="my.reset.token"
          onResetSuccess={onResetSuccess}
        />
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText('Nova senha'), 'senhaNova123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'senhaNova123');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));
    await waitFor(() => expect(onResetSuccess).toHaveBeenCalled());
    expect(mockedResetPassword).toHaveBeenCalledWith('my.reset.token', 'senhaNova123');
  });
});
