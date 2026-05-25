import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser, createTestEmployee } from '../test/factories';

const app = buildTestApp();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

async function authedUser() {
  const user = await createTestUser();
  return { user, token: signTestToken(user.id, user.email) };
}

describe('rota /api/employees', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/employees')).status).toBe(401);
  });

  it('POST / 201 cria funcionário ativo por default', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vendedor', role: 'Vendedor' });
    expect(res.status).toBe(201);
    expect(res.body.active).toBe(true);
  });

  it('GET / retorna apenas funcionários ativos, ordenados por nome', async () => {
    const { user, token } = await authedUser();
    const e1 = await createTestEmployee(user.id, 'Zeta');
    await createTestEmployee(user.id, 'Alfa');
    // Desativa via PUT
    await request(app)
      .put(`/api/employees/${e1.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false });

    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
    expect(res.body.map((e: any) => e.name)).toEqual(['Alfa']);
  });

  it('PUT /:id 404 em funcionário de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const e = await createTestEmployee(u1.id);
    const res = await request(app)
      .put(`/api/employees/${e.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'hack' });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id 404 em funcionário de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const e = await createTestEmployee(u1.id);
    const res = await request(app)
      .delete(`/api/employees/${e.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
