import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

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

describe('rota /api/product-collections', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/product-collections')).status).toBe(401);
  });

  it('POST / 201 cria coleção', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/product-collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Verão 2026' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Verão 2026');
  });

  it('POST / 400 em duplicata', async () => {
    const { token } = await authedUser();
    await request(app)
      .post('/api/product-collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    const res = await request(app)
      .post('/api/product-collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Coleção já existe');
  });

  it('GET / isolado por tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    await request(app)
      .post('/api/product-collections')
      .set('Authorization', `Bearer ${signTestToken(u1.id, u1.email)}`)
      .send({ name: 'Outro' });
    await request(app)
      .post('/api/product-collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Minha' });
    const res = await request(app).get('/api/product-collections').set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Minha');
  });

  it('DELETE /:id 404 em coleção de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const created = await request(app)
      .post('/api/product-collections')
      .set('Authorization', `Bearer ${signTestToken(u1.id, u1.email)}`)
      .send({ name: 'X' });
    const res = await request(app)
      .delete(`/api/product-collections/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
