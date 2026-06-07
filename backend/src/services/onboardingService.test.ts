import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { OnboardingService } from './onboardingService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

/**
 * Cria user + Company associada (o AuthService faz isso no register;
 * aqui replicamos pra teste isolado do service de onboarding).
 */
async function setupUser(overrides: { name?: string; email?: string } = {}) {
  const user = await createTestUser(overrides);
  await prisma.company.create({ data: { userId: user.id, name: `${user.name}'s Company` } });
  return user;
}

describe('OnboardingService.get', () => {
  it('retorna estado vazio quando user nunca preencheu', async () => {
    const user = await setupUser();
    const state = await OnboardingService.get(user.id);

    expect(state.completed).toBe(false);
    expect(state.completedAt).toBeNull();
    expect(state.cnpj).toBeNull();
    expect(state.taxRegime).toBeNull();
    expect(state.salesChannels).toEqual([]);
    expect(state.improvementGoals).toEqual([]);
    expect(state.whatsapp).toBeNull();
  });

  it('throw quando user não existe', async () => {
    await expect(OnboardingService.get(99999)).rejects.toThrow('Usuário não encontrado');
  });

  it('combina dados de Company e OnboardingResponse', async () => {
    const user = await setupUser();
    await OnboardingService.updatePartial(user.id, {
      taxRegime: 'MEI',
      segment: 'moda',
      salesChannels: ['fisica', 'whatsapp'],
      whatsapp: '11999998888',
    });

    const state = await OnboardingService.get(user.id);
    expect(state.taxRegime).toBe('MEI');
    expect(state.segment).toBe('moda');
    expect(state.salesChannels).toEqual(['fisica', 'whatsapp']);
    expect(state.whatsapp).toBe('11999998888');
  });
});

describe('OnboardingService.updatePartial', () => {
  it('aplica patch só com campos de Company', async () => {
    const user = await setupUser();
    const state = await OnboardingService.updatePartial(user.id, {
      cnpj: '00000000000191',
      taxRegime: 'SIMPLES',
      businessType: 'produtos',
    });

    expect(state.cnpj).toBe('00000000000191');
    expect(state.taxRegime).toBe('SIMPLES');
    expect(state.businessType).toBe('produtos');
    // OnboardingResponse não foi criado
    expect(state.salesChannels).toEqual([]);
  });

  it('aplica patch só com campos de OnboardingResponse (cria via upsert)', async () => {
    const user = await setupUser();
    const state = await OnboardingService.updatePartial(user.id, {
      salesChannels: ['ecommerce', 'instagram'],
      currentControl: 'planilha',
    });

    expect(state.salesChannels).toEqual(['ecommerce', 'instagram']);
    expect(state.currentControl).toBe('planilha');
    expect(state.whatsapp).toBe(''); // placeholder até o complete
  });

  it('chamadas sucessivas merge sem duplicar (idempotência por upsert)', async () => {
    const user = await setupUser();
    await OnboardingService.updatePartial(user.id, { salesChannels: ['fisica'] });
    await OnboardingService.updatePartial(user.id, { improvementGoals: ['financeiro'] });
    await OnboardingService.updatePartial(user.id, { salesChannels: ['fisica', 'whatsapp'] });

    const state = await OnboardingService.get(user.id);
    expect(state.salesChannels).toEqual(['fisica', 'whatsapp']);
    expect(state.improvementGoals).toEqual(['financeiro']);

    // E só existe 1 OnboardingResponse pra esse user
    const count = await prisma.onboardingResponse.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it('CNPJ duplicado dispara erro com mensagem clara', async () => {
    const u1 = await setupUser({ email: 'a@b.com' });
    const u2 = await setupUser({ email: 'c@d.com' });
    await OnboardingService.updatePartial(u1.id, { cnpj: '12345678000190' });

    await expect(
      OnboardingService.updatePartial(u2.id, { cnpj: '12345678000190' })
    ).rejects.toThrow('Este CNPJ já está cadastrado no sistema');
  });

  it('cnpj=null permite desvincular (opt-out)', async () => {
    const user = await setupUser();
    await OnboardingService.updatePartial(user.id, { cnpj: '00000000000191' });
    const cleared = await OnboardingService.updatePartial(user.id, { cnpj: null });
    expect(cleared.cnpj).toBeNull();
  });

  it('isolamento por tenant: PATCH de um user não toca o outro', async () => {
    const u1 = await setupUser({ email: 'a@b.com' });
    const u2 = await setupUser({ email: 'c@d.com' });
    await OnboardingService.updatePartial(u1.id, { segment: 'moda' });
    await OnboardingService.updatePartial(u2.id, { segment: 'alimentacao' });

    const s1 = await OnboardingService.get(u1.id);
    const s2 = await OnboardingService.get(u2.id);
    expect(s1.segment).toBe('moda');
    expect(s2.segment).toBe('alimentacao');
  });
});

describe('OnboardingService.complete', () => {
  async function preparedUser() {
    const user = await setupUser();
    // Preenche campos necessários para um complete bem-sucedido
    await OnboardingService.updatePartial(user.id, {
      taxRegime: 'MEI',
      segment: 'moda',
      businessType: 'produtos',
      multiStore: 'unica',
      salesChannels: ['fisica'],
      currentControl: 'cabeca',
      improvementGoals: ['financeiro'],
      equipment: ['so_celular'],
      learningPrefs: ['youtube'],
      techLevel: 'basico',
      tutorialPref: 'video',
    });
    return user;
  }

  it('throw quando whatsapp ausente', async () => {
    const user = await preparedUser();
    await expect(OnboardingService.complete(user.id, {})).rejects.toThrow(
      'WhatsApp é obrigatório'
    );
  });

  it('throw quando businessType ausente', async () => {
    const user = await setupUser();
    await OnboardingService.updatePartial(user.id, { segment: 'moda' });
    await expect(
      OnboardingService.complete(user.id, { whatsapp: '11999998888' })
    ).rejects.toThrow('Tipo de negócio é obrigatório');
  });

  it('throw quando segment ausente', async () => {
    const user = await setupUser();
    await OnboardingService.updatePartial(user.id, { businessType: 'produtos' });
    await expect(
      OnboardingService.complete(user.id, { whatsapp: '11999998888' })
    ).rejects.toThrow('Segmento é obrigatório');
  });

  it('seta onboardingCompletedAt em sucesso', async () => {
    const user = await preparedUser();
    const before = await prisma.user.findUnique({ where: { id: user.id } });
    expect(before!.onboardingCompletedAt).toBeNull();

    const state = await OnboardingService.complete(user.id, { whatsapp: '11999998888' });

    expect(state.completed).toBe(true);
    expect(state.completedAt).toBeInstanceOf(Date);
    expect(state.whatsapp).toBe('11999998888');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it('idempotência: completar 2x não retroage completedAt', async () => {
    const user = await preparedUser();
    const first = await OnboardingService.complete(user.id, { whatsapp: '11999998888' });
    const firstAt = first.completedAt!;

    await new Promise((resolve) => setTimeout(resolve, 30));

    const second = await OnboardingService.complete(user.id, { whatsapp: '11999998888' });
    expect(second.completedAt!.getTime()).toBe(firstAt.getTime());
  });

  it('complete aceita patch final junto (último step do wizard)', async () => {
    const user = await setupUser();
    // Tudo de uma vez, simulando wizard que só dá submit no fim
    const state = await OnboardingService.complete(user.id, {
      taxRegime: 'SIMPLES',
      segment: 'eletronicos',
      businessType: 'ambos',
      whatsapp: '11888887777',
    });
    expect(state.completed).toBe(true);
    expect(state.taxRegime).toBe('SIMPLES');
    expect(state.businessType).toBe('ambos');
  });
});
