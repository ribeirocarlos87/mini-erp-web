import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AparenciaCard from './AparenciaCard';

const mockSetTheme = vi.fn();
const mockSetPrimaryColor = vi.fn();
let storeState = { theme: 'light' as 'light' | 'dark', primaryColor: '#3b82f6' };

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({ ...storeState, language: 'pt-BR', setTheme: mockSetTheme, setPrimaryColor: mockSetPrimaryColor })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  storeState = { theme: 'light', primaryColor: '#3b82f6' };
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--color-primary');
  document.documentElement.style.removeProperty('--color-primary-hover');
});

describe('AparenciaCard — renderização', () => {
  it('renders the card title', () => {
    render(<AparenciaCard />);
    expect(screen.getByText('🎨 Aparência')).toBeTruthy();
  });

  it('shows both theme buttons', () => {
    render(<AparenciaCard />);
    expect(screen.getByText('☀ Claro')).toBeTruthy();
    expect(screen.getByText('🌙 Escuro')).toBeTruthy();
  });

  it('shows all 5 color swatches', () => {
    render(<AparenciaCard />);
    const swatches = document.querySelectorAll('button[aria-label]');
    expect(swatches.length).toBe(5);
  });
});

describe('AparenciaCard — seleção de tema', () => {
  it('calls setTheme("dark") when dark button is clicked', async () => {
    const user = userEvent.setup();
    render(<AparenciaCard />);
    await user.click(screen.getByText('🌙 Escuro'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme("light") when light button is clicked', async () => {
    const user = userEvent.setup();
    render(<AparenciaCard />);
    await user.click(screen.getByText('☀ Claro'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('sets data-theme attribute on documentElement when theme changes', async () => {
    const user = userEvent.setup();
    render(<AparenciaCard />);
    await user.click(screen.getByText('🌙 Escuro'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('AparenciaCard — seleção de cor', () => {
  it('calls setPrimaryColor when a color swatch is clicked', async () => {
    const user = userEvent.setup();
    render(<AparenciaCard />);
    const swatches = document.querySelectorAll('button[aria-label]');
    await user.click(swatches[1] as HTMLElement);
    expect(mockSetPrimaryColor).toHaveBeenCalled();
  });

  it('sets --color-primary CSS variable on click', async () => {
    const user = userEvent.setup();
    render(<AparenciaCard />);
    const swatches = document.querySelectorAll('button[aria-label]');
    const color = (swatches[0] as HTMLElement).getAttribute('aria-label')!;
    await user.click(swatches[0] as HTMLElement);
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(color);
  });

  it('sets --color-primary-hover as a darker shade on click', async () => {
    const user = userEvent.setup();
    render(<AparenciaCard />);
    const swatches = document.querySelectorAll('button[aria-label]');
    await user.click(swatches[0] as HTMLElement);
    const hover = document.documentElement.style.getPropertyValue('--color-primary-hover');
    expect(hover).toMatch(/^#[0-9a-f]{6}$/i);
    expect(hover).not.toBe((swatches[0] as HTMLElement).getAttribute('aria-label'));
  });
});

describe('AparenciaCard — função darken', () => {
  it('--color-primary-hover is darker than --color-primary', async () => {
    const user = userEvent.setup();
    render(<AparenciaCard />);
    const swatches = document.querySelectorAll('button[aria-label]');
    const color = (swatches[0] as HTMLElement).getAttribute('aria-label')!;
    await user.click(swatches[0] as HTMLElement);
    const primary = parseInt(color.replace('#', ''), 16);
    const hover = parseInt(
      document.documentElement.style.getPropertyValue('--color-primary-hover').replace('#', ''),
      16
    );
    expect(hover).toBeLessThan(primary);
  });
});
