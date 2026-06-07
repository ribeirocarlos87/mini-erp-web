import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from './settingsService';
import apiClient from './api';

vi.mock('./api');
const mockedApi = vi.mocked(apiClient);

beforeEach(() => vi.clearAllMocks());

describe('settingsService.updateProfile', () => {
  it('calls PATCH /auth/profile', async () => {
    mockedApi.patch = vi.fn().mockResolvedValue({ data: { id: 1, name: 'N', email: 'e@e.com' } });
    const result = await settingsService.updateProfile({ name: 'N', email: 'e@e.com' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/auth/profile', { name: 'N', email: 'e@e.com' });
    expect(result.name).toBe('N');
  });

  it('propagates error on failure', async () => {
    mockedApi.patch = vi.fn().mockRejectedValue({ response: { data: { error: 'E-mail já em uso' } } });
    await expect(settingsService.updateProfile({ name: 'N', email: 'dup@e.com' })).rejects.toMatchObject({
      response: { data: { error: 'E-mail já em uso' } },
    });
  });
});

describe('settingsService.updatePassword', () => {
  it('calls PATCH /auth/password', async () => {
    mockedApi.patch = vi.fn().mockResolvedValue({ data: { message: 'ok' } });
    await settingsService.updatePassword({ currentPassword: 'old', newPassword: 'new123' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/auth/password', { currentPassword: 'old', newPassword: 'new123' });
  });

  it('propagates error on wrong current password', async () => {
    mockedApi.patch = vi.fn().mockRejectedValue({ response: { data: { error: 'Senha atual incorreta' } } });
    await expect(settingsService.updatePassword({ currentPassword: 'errada', newPassword: 'nova123' })).rejects.toMatchObject({
      response: { data: { error: 'Senha atual incorreta' } },
    });
  });
});

describe('settingsService.getCompany', () => {
  it('calls GET /settings/company', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: { id: 1, name: 'Emp' } });
    const result = await settingsService.getCompany();
    expect(mockedApi.get).toHaveBeenCalledWith('/settings/company');
    expect(result.name).toBe('Emp');
  });

  it('propagates error on failure', async () => {
    mockedApi.get = vi.fn().mockRejectedValue({ response: { status: 500 } });
    await expect(settingsService.getCompany()).rejects.toMatchObject({ response: { status: 500 } });
  });
});

describe('settingsService.upsertCompany', () => {
  it('calls PATCH /settings/company', async () => {
    const payload = { name: 'Emp', cnpj: null, email: null, phone: null, address: null, logo: null };
    mockedApi.patch = vi.fn().mockResolvedValue({ data: payload });
    const result = await settingsService.upsertCompany(payload);
    expect(mockedApi.patch).toHaveBeenCalledWith('/settings/company', payload);
    expect(result.name).toBe('Emp');
  });

  it('propagates error on failure', async () => {
    const payload = { name: 'Emp', cnpj: null, email: null, phone: null, address: null, logo: null };
    mockedApi.patch = vi.fn().mockRejectedValue({ response: { status: 500 } });
    await expect(settingsService.upsertCompany(payload)).rejects.toMatchObject({ response: { status: 500 } });
  });
});
