import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SettingsService } from './settingsService';
import { AuthService } from './authService';
import { cleanDatabase, disconnectDatabase } from '../test/db';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('SettingsService.getCompany', () => {
  it('returns company data for the user', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senha123');
    const company = await SettingsService.getCompany(user.id);
    expect(company).not.toBeNull();
    expect(company!.userId).toBe(user.id);
  });
});

describe('SettingsService.upsertCompany', () => {
  it('updates company fields', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senha123');
    const result = await SettingsService.upsertCompany(user.id, {
      name: 'Minha Empresa',
      cnpj: '12345678000199',
      email: 'empresa@test.local',
      phone: '11999999999',
      address: 'Rua A, 100, SP',
      logo: null,
    });
    expect(result.name).toBe('Minha Empresa');
    expect(result.cnpj).toBe('12345678000199');
    expect(result.address).toBe('Rua A, 100, SP');
  });

  it('can be called twice — second call updates', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senha123');
    await SettingsService.upsertCompany(user.id, { name: 'Primeira', cnpj: null, email: null, phone: null, address: null, logo: null });
    const result = await SettingsService.upsertCompany(user.id, { name: 'Segunda', cnpj: null, email: null, phone: null, address: null, logo: null });
    expect(result.name).toBe('Segunda');
  });
});
