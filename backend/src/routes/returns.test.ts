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

async function setupSale(userId: number) {
  const cliente = await createTestClient(userId);
  const produto = await createTestProduct(userId, { quantityStock: 10, priceSale: 100 });
  const venda = await SaleService.createSale(userId, {
    client_id: cliente.id,
    seller_id: null,
    items: [{ product_id: produto.id, quantity: 2, unit_price: 100 }],
    payments: [{ method: 'cash', label: 'Dinheiro', amount: 200 }],
    subtotal: 200,
    discount: 0,
    surcharge: 0,
    total: 200,
  });
  return { cliente, produto, venda: venda! };
}

describe('rota /api/returns', () => {
  it('401 sem token', async () => {
    expect((await request(app).post('/api/returns').send({})).status).toBe(401);
    expect((await request(app).get('/api/returns/by-sale/1')).status).toBe(401);
  });

  it('POST / 400 com resolutionMethod inválido', async () => {
    const { user, token } = await authedUser();
    const { venda } = await setupSale(user.id);
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        saleId: venda.id,
        resolutionMethod: 'INVALIDO',
        items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      });
    expect(res.status).toBe(400);
  });

  it('POST / 400 com items vazio', async () => {
    const { user, token } = await authedUser();
    const { venda } = await setupSale(user.id);
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        saleId: venda.id,
        resolutionMethod: 'TROCA',
        items: [],
      });
    expect(res.status).toBe(400);
  });

  it('POST / 201 TROCA bem-sucedida', async () => {
    const { user, token } = await authedUser();
    const { venda } = await setupSale(user.id);
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        saleId: venda.id,
        resolutionMethod: 'TROCA',
        items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.resolutionMethod).toBe('TROCA');
    expect(res.body.totalRefund).toBe(100);
  });

  it('POST / 404 quando venda é de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const { venda } = await setupSale(u1.id);
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        saleId: venda.id,
        resolutionMethod: 'TROCA',
        items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      });
    expect(res.status).toBe(404);
  });

  it('GET /by-sale/:saleId 400 com id inválido', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .get('/api/returns/by-sale/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('GET /by-sale/:saleId 404 venda de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const { venda } = await setupSale(u1.id);
    const res = await request(app)
      .get(`/api/returns/by-sale/${venda.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
