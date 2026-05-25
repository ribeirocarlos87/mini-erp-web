import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser, createTestClient, createTestProduct } from '../test/factories';
import { SaleService } from '../services/saleService';

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

describe('rota /api/clients', () => {
  it('401 em todas operações sem token', async () => {
    expect((await request(app).get('/api/clients')).status).toBe(401);
    expect((await request(app).post('/api/clients').send({ name: 'X' })).status).toBe(401);
  });

  it('POST / 201 cria cliente', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Novo', email: 'cli@test.local' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Cliente Novo');
  });

  it('POST / 400 quando nome ausente', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
  });

  it('POST / 400 quando personType não é fisica/juridica', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', personType: 'outro' });
    expect(res.status).toBe(400);
  });

  it('GET /:id 400 com id inválido', async () => {
    const { token } = await authedUser();
    const res = await request(app).get('/api/clients/abc').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('GET /:id 404 cliente de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const c = await createTestClient(u1.id);
    const res = await request(app).get(`/api/clients/${c.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /:id/purchases 404 quando cliente é de outro tenant (Client not found → 404)', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const c = await createTestClient(u1.id);
    const res = await request(app)
      .get(`/api/clients/${c.id}/purchases`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /:id/purchases retorna histórico paginado com stats', async () => {
    const { user, token } = await authedUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });
    await SaleService.createSale(user.id, {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 100 }],
      payments: [{ method: 'cash', label: 'Dinheiro', amount: 100 }],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    });

    const res = await request(app)
      .get(`/api/clients/${cliente.id}/purchases`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats.totalSales).toBe(1);
    expect(res.body.stats.totalSpent).toBe(100);
    expect(res.body.page).toBe(1);
  });
});
