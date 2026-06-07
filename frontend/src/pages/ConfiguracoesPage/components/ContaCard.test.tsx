import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContaCard from './ContaCard';
import { settingsService } from '../../../services/settingsService';

const mockLogin = vi.fn();

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    user: { id: 1, name: 'Carlos', email: 'carlos@test.com' },
    login: mockLogin,
    token: 'fake-token',
  })),
}));

vi.mock('../../../services/settingsService', () => ({
  settingsService: {
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

const mockUpdateProfile = vi.mocked(settingsService.updateProfile);
const mockUpdatePassword = vi.mocked(settingsService.updatePassword);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ContaCard — renderização', () => {
  it('renders name and email fields pre-filled', () => {
    render(<ContaCard />);
    expect(screen.getByDisplayValue('Carlos')).toBeTruthy();
    expect(screen.getByDisplayValue('carlos@test.com')).toBeTruthy();
  });

  it('renders save and change password buttons', () => {
    render(<ContaCard />);
    expect(screen.getByText('Salvar dados')).toBeTruthy();
    expect(screen.getByText('Alterar senha')).toBeTruthy();
  });
});

describe('ContaCard — validação de perfil', () => {
  it('shows error when name is empty', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    const nameInput = screen.getByDisplayValue('Carlos');
    await user.clear(nameInput);
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeTruthy();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('shows error when email is empty', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    const emailInput = screen.getByDisplayValue('carlos@test.com');
    await user.clear(emailInput);
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => {
      expect(screen.getByText('E-mail é obrigatório')).toBeTruthy();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('shows error for invalid email', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    const emailInput = screen.getByDisplayValue('carlos@test.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'nao-e-email');
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeTruthy();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('calls updateProfile with trimmed data when valid', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({ id: 1, name: 'Carlos', email: 'carlos@test.com' });
    render(<ContaCard />);
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Carlos', email: 'carlos@test.com' });
    });
  });

  it('calls login with updated data and token after save', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({ id: 1, name: 'Novo Nome', email: 'carlos@test.com' });
    render(<ContaCard />);
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ id: 1, name: 'Novo Nome', email: 'carlos@test.com' }, 'fake-token');
    });
  });

  it('shows success message after saving profile', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({ id: 1, name: 'Carlos', email: 'carlos@test.com' });
    render(<ContaCard />);
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => {
      expect(screen.getByText('Dados salvos com sucesso')).toBeTruthy();
    });
  });

  it('shows API error message on profile save failure', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockRejectedValue({ response: { data: { error: 'E-mail já em uso' } } });
    render(<ContaCard />);
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => {
      expect(screen.getByText('E-mail já em uso')).toBeTruthy();
    });
  });

  it('clears field error when user edits the field', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    const emailInput = screen.getByDisplayValue('carlos@test.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'invalido');
    await user.click(screen.getByText('Salvar dados'));
    await waitFor(() => expect(screen.getByText('E-mail inválido')).toBeTruthy());
    await user.type(emailInput, '@');
    await waitFor(() => {
      expect(screen.queryByText('E-mail inválido')).toBeNull();
    });
  });
});

describe('ContaCard — validação de senha', () => {
  it('shows error when current password is empty', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    await user.click(screen.getByText('Alterar senha'));
    await waitFor(() => {
      expect(screen.getByText('Informe a senha atual')).toBeTruthy();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows error when new password is empty', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    const pwInputs = document.querySelectorAll('input[type="password"]');
    await user.type(pwInputs[0] as HTMLElement, 'senha123');
    await user.click(screen.getByText('Alterar senha'));
    await waitFor(() => {
      expect(screen.getByText('Informe a nova senha')).toBeTruthy();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows error when new password is shorter than 6 characters', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    const pwInputs = document.querySelectorAll('input[type="password"]');
    await user.type(pwInputs[0], 'atual123');
    await user.type(pwInputs[1], '123');
    await user.type(pwInputs[2], '123');
    await user.click(screen.getByText('Alterar senha'));
    await waitFor(() => {
      expect(screen.getByText('A nova senha deve ter pelo menos 6 caracteres')).toBeTruthy();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<ContaCard />);
    const pwInputs = document.querySelectorAll('input[type="password"]');
    await user.type(pwInputs[0], 'atual123');
    await user.type(pwInputs[1], 'nova123');
    await user.type(pwInputs[2], 'diferente');
    await user.click(screen.getByText('Alterar senha'));
    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem')).toBeTruthy();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('calls updatePassword with correct data when valid', async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockResolvedValue({ message: 'ok' });
    render(<ContaCard />);
    const pwInputs = document.querySelectorAll('input[type="password"]');
    await user.type(pwInputs[0], 'atual123');
    await user.type(pwInputs[1], 'nova456');
    await user.type(pwInputs[2], 'nova456');
    await user.click(screen.getByText('Alterar senha'));
    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith({ currentPassword: 'atual123', newPassword: 'nova456' });
    });
  });

  it('clears password fields and shows success after change', async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockResolvedValue({ message: 'ok' });
    render(<ContaCard />);
    const pwInputs = document.querySelectorAll('input[type="password"]');
    await user.type(pwInputs[0], 'atual123');
    await user.type(pwInputs[1], 'nova456');
    await user.type(pwInputs[2], 'nova456');
    await user.click(screen.getByText('Alterar senha'));
    await waitFor(() => {
      expect(screen.getByText('Senha alterada com sucesso')).toBeTruthy();
      expect((pwInputs[0] as HTMLInputElement).value).toBe('');
      expect((pwInputs[1] as HTMLInputElement).value).toBe('');
      expect((pwInputs[2] as HTMLInputElement).value).toBe('');
    });
  });

  it('shows API error message on password change failure', async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockRejectedValue({ response: { data: { error: 'Senha atual incorreta' } } });
    render(<ContaCard />);
    const pwInputs = document.querySelectorAll('input[type="password"]');
    await user.type(pwInputs[0], 'errada');
    await user.type(pwInputs[1], 'nova456');
    await user.type(pwInputs[2], 'nova456');
    await user.click(screen.getByText('Alterar senha'));
    await waitFor(() => {
      expect(screen.getByText('Senha atual incorreta')).toBeTruthy();
    });
  });
});
