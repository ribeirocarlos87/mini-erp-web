import { create } from 'zustand';

export interface User {
  id: number;
  email: string;
  name: string;
  // null/undefined = ainda não completou o onboarding; ProtectedLayout redireciona pra /onboarding.
  // Vem do backend como ISO string ou null. Optional para tolerar User objects salvos por
  // versões anteriores no localStorage (são tratados como "não completaram" e redirecionados).
  onboardingCompletedAt?: string | null;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  justLoggedIn: boolean;

  login: (user: User, token: string) => void;
  logout: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearJustLoggedIn: () => void;
  // Marca o onboarding como concluído após POST /api/onboarding/complete.
  markOnboardingComplete: (completedAt: string) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  // ✅ Lê o localStorage ANTES do primeiro render — sem flash de deslogar
  const storedUser = localStorage.getItem('user');
  const storedToken = localStorage.getItem('token');

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken ?? null,
    isLoading: false,
    error: null,
    justLoggedIn: false,

    login: (user: User, token: string) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      set({ user, token, error: null, justLoggedIn: true });
    },

    logout: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      set({ user: null, token: null, justLoggedIn: false });
    },

    setError: (error: string | null) => set({ error }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    clearJustLoggedIn: () => set({ justLoggedIn: false }),

    markOnboardingComplete: (completedAt: string) =>
      set((state) => {
        if (!state.user) return state;
        const next = { ...state.user, onboardingCompletedAt: completedAt };
        localStorage.setItem('user', JSON.stringify(next));
        return { user: next };
      }),

    // Mantido por compatibilidade, mas não é mais necessário
    initialize: () => {},
  };
});