import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AparenciaCard from './AparenciaCard';

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({
    theme: 'light',
    primaryColor: '#3b82f6',
    language: 'pt-BR',
    setTheme: vi.fn(),
    setPrimaryColor: vi.fn(),
  })),
}));

describe('AparenciaCard', () => {
  it('renders without crashing', () => {
    render(<AparenciaCard />);
    expect(screen.getByText('🎨 Aparência')).toBeTruthy();
  });

  it('shows theme toggle buttons', () => {
    render(<AparenciaCard />);
    expect(screen.getByText('☀ Claro')).toBeTruthy();
    expect(screen.getByText('🌙 Escuro')).toBeTruthy();
  });
});
