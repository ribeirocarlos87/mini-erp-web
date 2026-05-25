import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser, createTestSupplier } from '../test/factories';

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

describe('rota /api/suppliers', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/suppliers')).status).toBe(401);
    expect((await request(app).post('/api/suppliers').send({ name: 'X' })).status).toBe(401);
  });

  it('POST / 201 cria fornecedor', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fornecedor X', email: 'fornecedor@test.local' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Fornecedor X');
  });

  it('GET / lista isolada por tenant, ordenada por nome', async () => {
    const u1 = await createTestUser();
    const { user, token } = await authedUser();
    await createTestSupplier(u1.id, 'OutroTenant');
    await createTestSupplier(user.id, 'Zeta');
    await createTestSupplier(user.id, 'Alfa');

    const res = await request(app).get('/api/suppliers').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('DELETE /:id 404 em fornecedor de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const s = await createTestSupplier(u1.id);
    const res = await request(app)
      .delete(`/api/suppliers/${s.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
