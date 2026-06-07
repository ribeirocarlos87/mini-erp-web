import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore } from './settingsStore';

beforeEach(() => {
  useSettingsStore.setState({
    theme: 'light',
    language: 'pt-BR',
    primaryColor: '#3b82f6',
    notifications: { lowStock: true, returns: true },
  });
});

describe('settingsStore', () => {
  it('setTheme updates theme', () => {
    act(() => useSettingsStore.getState().setTheme('dark'));
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('setPrimaryColor updates primaryColor', () => {
    act(() => useSettingsStore.getState().setPrimaryColor('#10b981'));
    expect(useSettingsStore.getState().primaryColor).toBe('#10b981');
  });

  it('setNotification toggles a key', () => {
    act(() => useSettingsStore.getState().setNotification('lowStock', false));
    expect(useSettingsStore.getState().notifications.lowStock).toBe(false);
  });
});
