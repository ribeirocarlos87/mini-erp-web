import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationPrefs {
  lowStock: boolean;
  returns: boolean;
}

interface SettingsState {
  theme: 'light' | 'dark';
  language: 'pt-BR';
  primaryColor: string;
  notifications: NotificationPrefs;
  setTheme: (theme: 'light' | 'dark') => void;
  setPrimaryColor: (color: string) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'pt-BR',
      primaryColor: '#3b82f6',
      notifications: { lowStock: true, returns: true },

      setTheme: (theme) => set({ theme }),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setNotification: (key, value) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: value },
        })),
    }),
    { name: 'settings-store' }
  )
);
