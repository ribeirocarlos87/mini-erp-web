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

const ENDPOINTS = [
  '/api/reports/sales',
  '/api/reports/commissions',
  '/api/reports/sales-channels',
  '/api/reports/daily-cash',
  '/api/reports/payment-methods',
  '/api/reports/cash-flow',
  '/api/reports/product-performance',
  '/api/reports/sales-by-category',
  '/api/reports/stock-inventory',
  '/api/reports/clients',
  '/api/reports/client-lifecycle',
  '/api/reports/client-credits',
];

describe('rota /api/reports', () => {
  it('401 sem token em todos os 12 endpoints', async () => {
    for (const endpoint of ENDPOINTS) {
      const res = await request(app).get(endpoint);
      expect(res.status, `endpoint ${endpoint}`).toBe(401);
    }
  });

  it('200 em todos os 12 endpoints com token (smoke test de roteamento + service)', async () => {
    const { token } = await authedUser();
    for (const endpoint of ENDPOINTS) {
      const res = await request(app).get(endpoint).set('Authorization', `Bearer ${token}`);
      expect(res.status, `endpoint ${endpoint}`).toBe(200);
    }
  });

  it('GET /sales aceita group_by via query string e retorna groupBy correspondente', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .get('/api/reports/sales?group_by=product')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.groupBy).toBe('product');
  });

  it('GET /commissions aceita commission_rate como número (não-numérico vira 0)', async () => {
    const { token } = await authedUser();
    const valido = await request(app)
      .get('/api/reports/commissions?commission_rate=10')
      .set('Authorization', `Bearer ${token}`);
    expect(valido.status).toBe(200);

    const invalido = await request(app)
      .get('/api/reports/commissions?commission_rate=abc')
      .set('Authorization', `Bearer ${token}`);
    expect(invalido.status).toBe(200);
    expect(invalido.body.summary.totalCommissions).toBe(0);
  });

  it('GET /sales filtra por date_from e date_to', async () => {
    const { user, token } = await authedUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10 });
    await SaleService.createSale(user.id, {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 50 }],
      payments: [{ method: 'cash', label: 'Dinheiro', amount: 50 }],
      subtotal: 50,
      discount: 0,
      surcharge: 0,
      total: 50,
    });

    // Antes do range — sem vendas
    const fora = await request(app)
      .get('/api/reports/sales?date_from=2020-01-01&date_to=2020-12-31')
      .set('Authorization', `Bearer ${token}`);
    expect(fora.body.summary.totalSales).toBe(0);

    // Cobrindo hoje — venda presente
    const hoje = new Date().toISOString().split('T')[0];
    const dentro = await request(app)
      .get(`/api/reports/sales?date_from=${hoje}&date_to=${hoje}`)
      .set('Authorization', `Bearer ${token}`);
    expect(dentro.body.summary.totalSales).toBe(1);
  });

  it('GET /product-performance aceita filtros category_id/brand_id/seller_id', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .get('/api/reports/product-performance?category_id=999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
  });
});
