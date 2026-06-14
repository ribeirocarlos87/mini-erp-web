import { vi } from 'vitest';

vi.mock('../services/emailService', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { buildTestApp } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { AuthService } from '../services/authService';

const app = buildTestApp();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('POST /api/auth/register', () => {
  it('201 cria usuário e retorna { user, token }', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Novo User', email: 'novo@test.local', password: 'senha123' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('novo@test.local');
    expect(res.body.token).toBeTruthy();
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as any;
    expect(decoded.email).toBe('novo@test.local');
  });

  it('400 quando name é vazio', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'a@b.com', password: 'senha123' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('400 quando email é inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Foo', email: 'nao-email', password: 'senha123' });
    expect(res.status).toBe(400);
  });

  it('400 quando senha tem menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Foo', email: 'foo@bar.com', password: 'curt' });
    expect(res.status).toBe(400);
  });

  it('409 quando email já está registrado', async () => {
    await AuthService.registerUser('Primeiro', 'dup@test.local', 'senha123');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Segundo', email: 'dup@test.local', password: 'senha456' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email já registrado!');
  });
});

describe('POST /api/auth/login', () => {
  it('200 autentica e retorna token', async () => {
    await AuthService.registerUser('User', 'user@test.local', 'senha123');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.local', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('401 com email inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nao@existe.com', password: 'qualquer' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('E-mail ou senha inválidos');
  });

  it('401 com senha errada', async () => {
    await AuthService.registerUser('User', 'user@test.local', 'senhaCerta');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.local', password: 'senhaErrada' });
    expect(res.status).toBe(401);
  });

  it('400 quando email não é um email válido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nao-email', password: 'algo' });
    expect(res.status).toBe(400);
  });

  it('400 quando senha está vazia', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: '' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/auth/profile', () => {
  it('200 updates name and email', async () => {
    const reg = await AuthService.registerUser('Original', 'orig@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ name: 'Novo Nome', email: 'novo@test.local' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Novo Nome');
    expect(res.body.email).toBe('novo@test.local');
  });

  it('401 without token', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .send({ name: 'X', email: 'x@test.local' });
    expect(res.status).toBe(401);
  });

  it('400 when name is empty', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ name: '', email: 'u@test.local' });
    expect(res.status).toBe(400);
  });

  it('409 when email already taken', async () => {
    await AuthService.registerUser('A', 'a@test.local', 'senha123');
    const regB = await AuthService.registerUser('B', 'b@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${regB.token}`)
      .send({ name: 'B', email: 'a@test.local' });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/auth/password', () => {
  it('200 changes password', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senhaAntiga');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ currentPassword: 'senhaAntiga', newPassword: 'senhaNova123' });
    expect(res.status).toBe(200);
  });

  it('401 when current password is wrong', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senhaAntiga');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ currentPassword: 'errada', newPassword: 'senhaNova123' });
    expect(res.status).toBe(401);
  });

  it('400 when newPassword is missing', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senhaAntiga');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ currentPassword: 'senhaAntiga' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('200 com email existente (e não vaza se existe)', async () => {
    await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'u@test.local' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Se o email existir');
  });

  it('200 com email desconhecido (anti-enumeração)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nao@existe.local' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Se o email existir');
  });

  it('400 quando email é inválido', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nao-um-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('200 com token válido e nova senha', async () => {
    const { user } = await AuthService.registerUser('U', 'reset@test.local', 'senhaAntiga');
    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      process.env.RESET_JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'senhaNova123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('sucesso');
  });

  it('401 com token inválido', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalido.token.aqui', newPassword: 'senhaNova123' });
    expect(res.status).toBe(401);
  });

  it('400 com newPassword menor que 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'qualquer', newPassword: '123' });
    expect(res.status).toBe(400);
  });

  it('400 quando newPassword está ausente', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'qualquer' });
    expect(res.status).toBe(400);
  });
});
