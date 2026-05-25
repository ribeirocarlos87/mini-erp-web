import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('apiClient — interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('request interceptor anexa Authorization Bearer quando há token em localStorage', async () => {
    localStorage.setItem('token', 'tk-abc');
    const { default: apiClient } = await import('./api');

    const config: any = { headers: {} };
    const interceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const out = interceptor(config);

    expect(out.headers.Authorization).toBe('Bearer tk-abc');
  });

  it('request interceptor não adiciona Authorization quando não há token', async () => {
    const { default: apiClient } = await import('./api');

    const config: any = { headers: {} };
    const interceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const out = interceptor(config);

    expect(out.headers.Authorization).toBeUndefined();
  });

  it('response interceptor em 401 fora de rotas de auth: limpa localStorage e redireciona para /login', async () => {
    localStorage.setItem('token', 'tk');
    localStorage.setItem('user', '{}');
    const { default: apiClient } = await import('./api');

    // Mock do redirect
    const locationSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() { return ''; },
        set href(v: string) { locationSetter(v); },
      },
    });

    const interceptor = (apiClient.interceptors.response as any).handlers[0].rejected;
    const error = { response: { status: 401 }, config: { url: '/products' } };

    await expect(interceptor(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(locationSetter).toHaveBeenCalledWith('/login');
  });

  it('response interceptor em 401 em rota de auth: NÃO redireciona nem limpa storage', async () => {
    localStorage.setItem('token', 'tk');
    const { default: apiClient } = await import('./api');

    const locationSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() { return ''; },
        set href(v: string) { locationSetter(v); },
      },
    });

    const interceptor = (apiClient.interceptors.response as any).handlers[0].rejected;
    const error = { response: { status: 401 }, config: { url: '/auth/login' } };

    await expect(interceptor(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBe('tk');
    expect(locationSetter).not.toHaveBeenCalled();
  });

  it('response interceptor não trata erros não-401 (passa adiante)', async () => {
    const { default: apiClient } = await import('./api');

    const interceptor = (apiClient.interceptors.response as any).handlers[0].rejected;
    const error = { response: { status: 500 }, config: { url: '/x' } };

    await expect(interceptor(error)).rejects.toBe(error);
  });
});
