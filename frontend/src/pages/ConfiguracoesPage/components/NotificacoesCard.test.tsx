import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificacoesCard from './NotificacoesCard';

const mockSetNotification = vi.fn();
let storeState = { notifications: { lowStock: true, returns: true } };

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({ ...storeState, setNotification: mockSetNotification })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  storeState = { notifications: { lowStock: true, returns: true } };
});

describe('NotificacoesCard — renderização', () => {
  it('renders the card title', () => {
    render(<NotificacoesCard />);
    expect(screen.getByText('🔔 Notificações')).toBeTruthy();
  });

  it('shows both notification rows', () => {
    render(<NotificacoesCard />);
    expect(screen.getByText('Estoque Baixo')).toBeTruthy();
    expect(screen.getByText('Devoluções')).toBeTruthy();
  });
});

describe('NotificacoesCard — toggles', () => {
  it('calls setNotification("lowStock", false) when lowStock toggle is clicked (currently on)', async () => {
    const user = userEvent.setup();
    render(<NotificacoesCard />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    await waitFor(() => {
      expect(mockSetNotification).toHaveBeenCalledWith('lowStock', false);
    });
  });

  it('calls setNotification("returns", false) when returns toggle is clicked (currently on)', async () => {
    const user = userEvent.setup();
    render(<NotificacoesCard />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    await waitFor(() => {
      expect(mockSetNotification).toHaveBeenCalledWith('returns', false);
    });
  });

  it('calls setNotification("lowStock", true) when toggle is clicked while off', async () => {
    const user = userEvent.setup();
    storeState = { notifications: { lowStock: false, returns: true } };
    render(<NotificacoesCard />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    await waitFor(() => {
      expect(mockSetNotification).toHaveBeenCalledWith('lowStock', true);
    });
  });

  it('calls setNotification("returns", true) when toggle is clicked while off', async () => {
    const user = userEvent.setup();
    storeState = { notifications: { lowStock: true, returns: false } };
    render(<NotificacoesCard />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    await waitFor(() => {
      expect(mockSetNotification).toHaveBeenCalledWith('returns', true);
    });
  });
});
