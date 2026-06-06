import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { AuthService, AppError } from './authService';
import { cleanDatabase, disconnectDatabase } from '../test/db';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('AuthService.updateProfile', () => {
  it('updates name and email', async () => {
    const { user } = await AuthService.registerUser('Original', 'orig@test.local', 'senha123');
    const updated = await AuthService.updateProfile(user.id, { name: 'Novo Nome', email: 'novo@test.local' });
    expect(updated.name).toBe('Novo Nome');
    expect(updated.email).toBe('novo@test.local');
  });

  it('throws 409 when email already taken by another user', async () => {
    await AuthService.registerUser('A', 'a@test.local', 'senha123');
    const { user: b } = await AuthService.registerUser('B', 'b@test.local', 'senha123');
    await expect(
      AuthService.updateProfile(b.id, { name: 'B', email: 'a@test.local' })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('AuthService.updatePassword', () => {
  it('updates password when current password is correct', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senhaAntiga');
    await expect(
      AuthService.updatePassword(user.id, { currentPassword: 'senhaAntiga', newPassword: 'senhaNova' })
    ).resolves.not.toThrow();
    // confirm new password works on login
    await expect(AuthService.loginUser('u@test.local', 'senhaNova')).resolves.toBeTruthy();
  });

  it('throws 401 when current password is wrong', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senhaAntiga');
    await expect(
      AuthService.updatePassword(user.id, { currentPassword: 'errada', newPassword: 'senhaNova' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('throws 404 when user does not exist', async () => {
    await expect(
      AuthService.updatePassword(99999, { currentPassword: 'pass', newPassword: 'newpass' })
    ).rejects.toMatchObject({ status: 404 });
  });
});
