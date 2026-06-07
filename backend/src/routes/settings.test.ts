import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
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

describe('GET /api/settings/company', () => {
  it('200 returns company for logged-in user', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .get('/api/settings/company')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId');
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/settings/company');
    expect(res.status).toBe(401);
  });

  it('returns a company object for new user (auto-created on register)', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .get('/api/settings/company')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('name');
  });
});

describe('PATCH /api/settings/company', () => {
  it('200 upserts company data', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Empresa Teste', cnpj: null, email: null, phone: null, address: 'Rua X', logo: null });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Empresa Teste');
    expect(res.body.address).toBe('Rua X');
  });

  it('second PATCH updates existing record', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nome Inicial', cnpj: null, email: null, phone: null, address: null, logo: null });
    const res = await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nome Atualizado', cnpj: null, email: null, phone: null, address: null, logo: null });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nome Atualizado');
  });

  it('401 without token', async () => {
    const res = await request(app)
      .patch('/api/settings/company')
      .send({ name: 'X', cnpj: null, email: null, phone: null, address: null, logo: null });
    expect(res.status).toBe(401);
  });

  it('400 when name is missing', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ cnpj: null });
    expect(res.status).toBe(400);
  });

  it('400 when name is empty string', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ', cnpj: null, email: null, phone: null, address: null, logo: null });
    expect(res.status).toBe(400);
  });

  it('tenant isolation: user B cannot see user A company data', async () => {
    const { token: tokenA } = await AuthService.registerUser('A', 'a@test.local', 'senha123');
    const { token: tokenB } = await AuthService.registerUser('B', 'b@test.local', 'senha123');
    await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Empresa Exclusiva A', cnpj: null, email: null, phone: null, address: null, logo: null });
    const res = await request(app)
      .get('/api/settings/company')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.name).not.toBe('Empresa Exclusiva A');
  });

  it('saves optional fields correctly', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Emp', cnpj: '11222333000181', email: 'emp@test.com', phone: '11999990000', address: 'Rua Y', logo: null });
    expect(res.status).toBe(200);
    expect(res.body.cnpj).toBe('11222333000181');
    expect(res.body.email).toBe('emp@test.com');
    expect(res.body.phone).toBe('11999990000');
  });
});
