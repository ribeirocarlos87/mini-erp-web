import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    token: null,
    isLoading: false,
    error: null,
    justLoggedIn: false,
  });
});

describe('authStore', () => {
  it('estado inicial: tudo nulo/false', () => {
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.justLoggedIn).toBe(false);
  });

  it('login() seta user/token no estado E persiste em localStorage', () => {
    const user = { id: 42, email: 'a@b.com', name: 'Alice' };
    useAuthStore.getState().login(user, 'tk-123');

    const s = useAuthStore.getState();
    expect(s.user).toEqual(user);
    expect(s.token).toBe('tk-123');
    expect(s.justLoggedIn).toBe(true);
    expect(s.error).toBeNull();

    expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    expect(localStorage.getItem('token')).toBe('tk-123');
  });

  it('login() limpa erro anterior', () => {
    useAuthStore.setState({ error: 'erro antigo' });
    useAuthStore.getState().login({ id: 1, email: 'x@y.com', name: 'X' }, 'tk');
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('logout() limpa estado e localStorage', () => {
    useAuthStore.getState().login({ id: 1, email: 'a@b.com', name: 'A' }, 'tk');
    expect(localStorage.getItem('token')).toBeTruthy();

    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(s.justLoggedIn).toBe(false);
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('setError / setLoading atualizam apenas o campo correspondente', () => {
    useAuthStore.getState().setError('erro X');
    expect(useAuthStore.getState().error).toBe('erro X');
    expect(useAuthStore.getState().user).toBeNull();

    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    expect(useAuthStore.getState().error).toBe('erro X');
  });

  it('clearJustLoggedIn zera flag de "acabei de logar"', () => {
    useAuthStore.getState().login({ id: 1, email: 'x@y.com', name: 'X' }, 'tk');
    expect(useAuthStore.getState().justLoggedIn).toBe(true);
    useAuthStore.getState().clearJustLoggedIn();
    expect(useAuthStore.getState().justLoggedIn).toBe(false);
  });
});
