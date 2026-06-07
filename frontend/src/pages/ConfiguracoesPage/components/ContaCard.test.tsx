import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContaCard from './ContaCard';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    user: { id: 1, name: 'Carlos', email: 'carlos@test.com' },
    login: vi.fn(),
    token: 'fake-token',
  })),
}));

vi.mock('../../../services/settingsService', () => ({
  settingsService: {
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

describe('ContaCard', () => {
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
