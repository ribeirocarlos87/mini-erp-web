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
