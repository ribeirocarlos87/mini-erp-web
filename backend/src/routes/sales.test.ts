import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser, createTestClient, createTestProduct } from '../test/factories';

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

function buildSalePayload(clientId: number, productId: number) {
  return {
    client_id: clientId,
    seller_id: null,
    items: [{ product_id: productId, quantity: 1, unit_price: 100 }],
    payments: [{ method: 'cash', label: 'Dinheiro', amount: 100 }],
    subtotal: 100,
    discount: 0,
    surcharge: 0,
    total: 100,
  };
}

describe('rota /api/sales', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/sales')).status).toBe(401);
    expect((await request(app).post('/api/sales').send({})).status).toBe(401);
  });

  it('POST / 201 cria venda', async () => {
    const { user, token } = await authedUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10 });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(buildSalePayload(cliente.id, produto.id));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeGreaterThan(0);
    expect(Number(res.body.totalValue)).toBe(100);
  });

  it('POST / 400 quando items vazio', async () => {
    const { user, token } = await authedUser();
    const cliente = await createTestClient(user.id);
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        client_id: cliente.id,
        items: [],
        payments: [{ method: 'cash', label: 'X', amount: 100 }],
        subtotal: 100,
        total: 100,
      });
    expect(res.status).toBe(400);
  });

  it('POST / 400 quando method de pagamento é inválido', async () => {
    const { user, token } = await authedUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10 });
    const payload = buildSalePayload(cliente.id, produto.id);
    (payload.payments[0] as any).method = 'bitcoin';
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(400);
  });

  it('POST / 400 quando service rejeita (cliente fora do tenant)', async () => {
    const u1 = await createTestUser();
    const { user, token } = await authedUser();
    const clienteOutro = await createTestClient(u1.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10 });
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(buildSalePayload(clienteOutro.id, produto.id));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cliente não encontrado');
  });

  it('GET /:id 400 com id não-numérico', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .get('/api/sales/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('GET /:id 404 venda de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const clienteU1 = await createTestClient(u1.id);
    const produtoU1 = await createTestProduct(u1.id, { quantityStock: 10 });
    const venda = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${signTestToken(u1.id, u1.email)}`)
      .send(buildSalePayload(clienteU1.id, produtoU1.id));

    const res = await request(app)
      .get(`/api/sales/${venda.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET / retorna lista paginada', async () => {
    const { user, token } = await authedUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .send(buildSalePayload(cliente.id, produto.id));
    }
    const res = await request(app).get('/api/sales?page=1&limit=10').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.sales).toHaveLength(3);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
  });
});
