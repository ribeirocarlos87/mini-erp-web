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

describe('rota /api/product-brands', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/product-brands')).status).toBe(401);
  });

  it('POST / 201 cria marca', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/product-brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nike' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Nike');
  });

  it('POST / 400 em duplicata', async () => {
    const { token } = await authedUser();
    await request(app)
      .post('/api/product-brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    const res = await request(app)
      .post('/api/product-brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Marca já existe');
  });

  it('GET / retorna apenas marcas do tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    await request(app)
      .post('/api/product-brands')
      .set('Authorization', `Bearer ${signTestToken(u1.id, u1.email)}`)
      .send({ name: 'Outro' });
    await request(app)
      .post('/api/product-brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Minha' });

    const res = await request(app).get('/api/product-brands').set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Minha');
  });

  it('DELETE /:id 404 em marca de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const created = await request(app)
      .post('/api/product-brands')
      .set('Authorization', `Bearer ${signTestToken(u1.id, u1.email)}`)
      .send({ name: 'X' });
    const res = await request(app)
      .delete(`/api/product-brands/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
