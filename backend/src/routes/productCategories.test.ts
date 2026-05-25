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

describe('rota /api/product-categories', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/product-categories')).status).toBe(401);
    expect((await request(app).post('/api/product-categories').send({ name: 'X' })).status).toBe(401);
  });

  it('POST / 201 cria categoria', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Camisetas' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Camisetas');
  });

  it('POST / 400 em duplicata', async () => {
    const { token } = await authedUser();
    await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dup' });
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dup' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Categoria já existe');
  });

  it('GET / retorna apenas categorias do tenant ordenadas por nome', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    // Cria categoria em outro tenant
    await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${signTestToken(u1.id, u1.email)}`)
      .send({ name: 'OutroTenant' });
    // E uma do meu
    await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Minha' });

    const res = await request(app)
      .get('/api/product-categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Minha');
  });

  it('DELETE /:id 404 em categoria de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const created = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${signTestToken(u1.id, u1.email)}`)
      .send({ name: 'X' });

    const res = await request(app)
      .delete(`/api/product-categories/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
