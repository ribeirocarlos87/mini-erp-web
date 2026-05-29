import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OnboardingPage from './OnboardingPage';
import { useAuthStore } from '../../store/authStore';
import { onboardingService } from '../../services/onboardingService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/onboardingService', async () => {
  const actual = await vi.importActual<typeof import('../../services/onboardingService')>(
    '../../services/onboardingService'
  );
  return {
    ...actual,
    onboardingService: {
      get: vi.fn(),
      updatePartial: vi.fn(),
      complete: vi.fn(),
    },
  };
});

const EMPTY_STATE = {
  completed: false,
  completedAt: null,
  cnpj: null,
  taxRegime: null,
  segment: null,
  businessType: null,
  multiStore: null,
  salesChannels: [],
  heardAbout: null,
  currentControl: null,
  improvementGoals: [],
  equipment: [],
  learningPrefs: [],
  techLevel: null,
  tutorialPref: null,
  whatsapp: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({
    user: { id: 1, email: 'pedro@test.com', name: 'Pedro Santos', onboardingCompletedAt: null },
    token: 'tk',
    isLoading: false,
    error: null,
    justLoggedIn: false,
  });
  (onboardingService.get as any).mockResolvedValue(EMPTY_STATE);
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>
  );

describe('OnboardingPage', () => {
  it('renderiza step de boas-vindas com primeiro nome do user', async () => {
    renderPage();
    expect(await screen.findByText(/Olá, Pedro!/)).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo ao MINI ERP')).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 7')).toBeInTheDocument();
  });

  it('avança do welcome para "Sua empresa" ao clicar em "Começar"', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Olá, Pedro!/);

    await user.click(screen.getByRole('button', { name: /Começar/i }));

    expect(await screen.findByText('Sua empresa')).toBeInTheDocument();
    expect(screen.getByText('Passo 2 de 7')).toBeInTheDocument();
  });

  it('botão "Continuar" exibe erro de validação se campos obrigatórios faltam', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Olá, Pedro!/);
    await user.click(screen.getByRole('button', { name: /Começar/i }));
    // Está no step "Sua empresa" — sem selecionar nada, tenta continuar
    await user.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(await screen.findByText(/Selecione o que sua empresa vende/i)).toBeInTheDocument();
    // updatePartial nem foi chamado porque validação client-side bloqueou
    expect(onboardingService.updatePartial).not.toHaveBeenCalled();
  });

  it('se GET retorna completed=true, redireciona para /dashboard', async () => {
    (onboardingService.get as any).mockResolvedValue({
      ...EMPTY_STATE,
      completed: true,
      completedAt: '2026-05-29T12:00:00Z',
    });
    renderPage();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  });

  it('botão "Voltar" volta um step', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Olá, Pedro!/);
    await user.click(screen.getByRole('button', { name: /Começar/i }));
    expect(await screen.findByText('Sua empresa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(await screen.findByText(/Olá, Pedro!/)).toBeInTheDocument();
  });
});
