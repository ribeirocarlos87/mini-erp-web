import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificacoesCard from './NotificacoesCard';

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({
    notifications: { lowStock: true, returns: true },
    setNotification: vi.fn(),
  })),
}));

describe('NotificacoesCard', () => {
  it('renders without crashing', () => {
    render(<NotificacoesCard />);
    expect(screen.getByText('🔔 Notificações')).toBeTruthy();
  });

  it('shows both notification toggles', () => {
    render(<NotificacoesCard />);
    expect(screen.getByText('Estoque Baixo')).toBeTruthy();
    expect(screen.getByText('Devoluções')).toBeTruthy();
  });
});
