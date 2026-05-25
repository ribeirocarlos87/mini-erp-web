import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';
import { FinancialService } from '../services/financialService';

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

describe('rota /api/financial — transações', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/financial/transactions')).status).toBe(401);
    expect((await request(app).post('/api/financial/transactions').send({})).status).toBe(401);
  });

  it('POST /transactions 201 cria', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/financial/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'DESPESA', description: 'Conta de luz', value: 200, date: '2026-01-15' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('DESPESA');
  });

  it('POST /transactions 400 quando campos obrigatórios faltam', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/financial/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'X' });
    expect(res.status).toBe(400);
  });

  it('GET /transactions filtra por type via query', async () => {
    const { user, token } = await authedUser();
    await FinancialService.createTransaction(user.id, { type: 'DESPESA', description: 'D', value: 10, date: '2026-01-01' });
    await FinancialService.createTransaction(user.id, { type: 'RECEITA', description: 'R', value: 20, date: '2026-01-01' });

    const res = await request(app)
      .get('/api/financial/transactions?type=DESPESA')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('DESPESA');
  });

  it('DELETE /transactions/:id 404 em transação de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const t = await FinancialService.createTransaction(u1.id, { type: 'DESPESA', description: 'X', value: 10, date: '2026-01-01' });
    const res = await request(app)
      .delete(`/api/financial/transactions/${t.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('rota /api/financial — recorrentes', () => {
  it('POST /recurring 201 cria com defaults', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/financial/recurring')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Aluguel', value: 2500, frequency: 'MENSAL', startDate: '2026-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.active).toBe(true);
  });

  it('POST /recurring 400 quando frequency ausente', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/financial/recurring')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'X', value: 100, startDate: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('GET /recurring isolado por tenant', async () => {
    const u1 = await createTestUser();
    const { user, token } = await authedUser();
    await FinancialService.createRecurringExpense(u1.id, { description: 'OutroTenant', value: 50, frequency: 'MENSAL', startDate: '2026-01-01' });
    await FinancialService.createRecurringExpense(user.id, { description: 'Minha', value: 100, frequency: 'MENSAL', startDate: '2026-01-01' });
    const res = await request(app).get('/api/financial/recurring').set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].description).toBe('Minha');
  });

  it('DELETE /recurring/:id 404 em recorrente de outro tenant', async () => {
    const u1 = await createTestUser();
    const { token } = await authedUser();
    const r = await FinancialService.createRecurringExpense(u1.id, { description: 'X', value: 100, frequency: 'MENSAL', startDate: '2026-01-01' });
    const res = await request(app)
      .delete(`/api/financial/recurring/${r.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
