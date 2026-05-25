import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser, createTestProduct } from '../test/factories';

const app = buildTestApp();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

async function authedUser() {
  const user = await createTestUser();
  const token = signTestToken(user.id, user.email);
  return { user, token };
}

describe('rota /api/products', () => {
  it('401 em todas as operações sem token', async () => {
    expect((await request(app).get('/api/products')).status).toBe(401);
    expect((await request(app).post('/api/products').send({ name: 'X' })).status).toBe(401);
    expect((await request(app).put('/api/products/1').send({ name: 'X' })).status).toBe(401);
    expect((await request(app).delete('/api/products/1')).status).toBe(401);
  });

  it('GET / retorna produtos do tenant com paginação', async () => {
    const { user, token } = await authedUser();
    await createTestProduct(user.id);
    await createTestProduct(user.id);

    const res = await request(app)
      .get('/api/products?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  it('POST / cria produto e ignora SKU enviado (gera server-side)', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Novo', code: 'TENTATIVA-INVASIVA' });

    expect(res.status).toBe(201);
    expect(res.body.code).not.toBe('TENTATIVA-INVASIVA');
    expect(res.body.code).toBe('PRD-000001');
  });

  it('POST / 400 quando nome ausente', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ priceSale: 100 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('POST / 400 quando priceSale fora de range', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', priceSale: 999999999 });
    expect(res.status).toBe(400);
  });

  it('GET /:id 404 para produto de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token: tokenU2 } = await authedUser();
    const p = await createTestProduct(u1.id);

    const res = await request(app)
      .get(`/api/products/${p.id}`)
      .set('Authorization', `Bearer ${tokenU2}`);
    expect(res.status).toBe(404);
  });

  it('PUT /:id 404 ao tentar editar produto de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token: tokenU2 } = await authedUser();
    const p = await createTestProduct(u1.id);

    const res = await request(app)
      .put(`/api/products/${p.id}`)
      .set('Authorization', `Bearer ${tokenU2}`)
      .send({ name: 'hack' });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id 404 ao tentar deletar produto de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token: tokenU2 } = await authedUser();
    const p = await createTestProduct(u1.id);

    const res = await request(app)
      .delete(`/api/products/${p.id}`)
      .set('Authorization', `Bearer ${tokenU2}`);
    expect(res.status).toBe(404);
  });

  it('GET /low-stock retorna apenas produtos abaixo do minStock', async () => {
    const { user, token } = await authedUser();
    await createTestProduct(user.id, { quantityStock: 0 });
    const baixo = await createTestProduct(user.id, { quantityStock: 1 });
    await (await import('../db/prismaClient')).default.product.update({
      where: { id: baixo.id },
      data: { minStock: 5 },
    });
    await createTestProduct(user.id, { quantityStock: 100 });

    const res = await request(app)
      .get('/api/products/low-stock')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].id).toBe(baixo.id);
  });
});
