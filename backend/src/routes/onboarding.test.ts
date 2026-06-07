import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, signTestToken } from '../test/app';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

const app = buildTestApp();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

async function setupUser() {
  const user = await createTestUser();
  await prisma.company.create({ data: { userId: user.id, name: `${user.name}'s Company` } });
  return { user, token: signTestToken(user.id, user.email) };
}

describe('rota /api/onboarding', () => {
  it('401 em todas operações sem token', async () => {
    expect((await request(app).get('/api/onboarding')).status).toBe(401);
    expect((await request(app).patch('/api/onboarding').send({})).status).toBe(401);
    expect((await request(app).post('/api/onboarding/complete').send({})).status).toBe(401);
  });

  it('GET retorna estado vazio para user recém-criado', async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .get('/api/onboarding')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
    expect(res.body.completedAt).toBeNull();
    expect(res.body.salesChannels).toEqual([]);
    expect(res.body.cnpj).toBeNull();
  });

  it('PATCH com patch parcial válido retorna 200 + estado atualizado', async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ taxRegime: 'MEI', segment: 'moda', salesChannels: ['fisica', 'whatsapp'] });

    expect(res.status).toBe(200);
    expect(res.body.taxRegime).toBe('MEI');
    expect(res.body.segment).toBe('moda');
    expect(res.body.salesChannels).toEqual(['fisica', 'whatsapp']);
  });

  it('PATCH com segment fora do enum → 400', async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ segment: 'inexistente' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('PATCH com canal de venda fora do enum → 400', async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ salesChannels: ['fisica', 'orkut'] });
    expect(res.status).toBe(400);
  });

  it('PATCH com CNPJ inválido (não-14-dígitos) → 400', async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ cnpj: '123' });
    expect(res.status).toBe(400);
  });

  it('PATCH com CNPJ null (opt-out) → 200', async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ cnpj: null });
    expect(res.status).toBe(200);
    expect(res.body.cnpj).toBeNull();
  });

  it('PATCH com whatsapp não-numérico → 400', async () => {
    const { token } = await setupUser();
    const res = await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ whatsapp: '(11) 99999-8888' });
    expect(res.status).toBe(400);
  });

  it('POST /complete sem whatsapp → 400 com mensagem clara', async () => {
    const { token } = await setupUser();
    await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ segment: 'moda', businessType: 'produtos' });

    const res = await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('WhatsApp');
  });

  it('POST /complete com todos campos retorna 200 e marca completed', async () => {
    const { user, token } = await setupUser();
    const res = await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        taxRegime: 'MEI',
        segment: 'moda',
        businessType: 'produtos',
        multiStore: 'unica',
        salesChannels: ['fisica'],
        currentControl: 'planilha',
        improvementGoals: ['financeiro'],
        equipment: ['so_celular'],
        learningPrefs: ['youtube'],
        techLevel: 'basico',
        tutorialPref: 'video',
        whatsapp: '11999998888',
      });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.completedAt).toBeTruthy();
    expect(res.body.whatsapp).toBe('11999998888');

    const userDb = await prisma.user.findUnique({ where: { id: user.id } });
    expect(userDb!.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it('isolamento por tenant: GET de um user nunca retorna dados do outro', async () => {
    const u1 = await setupUser();
    const u2 = await setupUser();

    await request(app)
      .patch('/api/onboarding')
      .set('Authorization', `Bearer ${u1.token}`)
      .send({ segment: 'moda', whatsapp: '11111111111' });

    const res = await request(app)
      .get('/api/onboarding')
      .set('Authorization', `Bearer ${u2.token}`);

    expect(res.body.segment).toBeNull();
    expect(res.body.whatsapp).toBeNull();
  });
});
