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
});
