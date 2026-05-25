import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { FinancialService } from './financialService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('FinancialService — transações', () => {
  it('createTransaction grava com defaults: status=PAGO, campos opcionais null', async () => {
    const user = await createTestUser();
    const t = await FinancialService.createTransaction(user.id, {
      type: 'DESPESA',
      description: 'Conta de luz',
      value: 250.75,
      date: '2026-03-15',
    });
    expect(t.type).toBe('DESPESA');
    expect(t.description).toBe('Conta de luz');
    expect(Number(t.value)).toBe(250.75);
    expect(t.status).toBe('PAGO');
    expect(t.category).toBeNull();
    expect(t.paymentMethod).toBeNull();
    expect(t.notes).toBeNull();
    expect(t.userId).toBe(user.id);
  });

  it('createTransaction persiste todos os campos opcionais quando enviados', async () => {
    const user = await createTestUser();
    const t = await FinancialService.createTransaction(user.id, {
      type: 'RECEITA',
      category: 'Venda avulsa',
      description: 'Venda no balcão',
      value: 89.9,
      date: '2026-03-01',
      paymentMethod: 'pix',
      status: 'PENDENTE',
      notes: 'recebimento confirmado',
    });
    expect(t.category).toBe('Venda avulsa');
    expect(t.paymentMethod).toBe('pix');
    expect(t.status).toBe('PENDENTE');
    expect(t.notes).toBe('recebimento confirmado');
  });

  it('getTransactions isola por tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await FinancialService.createTransaction(u1.id, { type: 'DESPESA', description: 'A', value: 10, date: '2026-01-01' });
    await FinancialService.createTransaction(u2.id, { type: 'DESPESA', description: 'B', value: 20, date: '2026-01-01' });

    const r1 = await FinancialService.getTransactions(u1.id);
    expect(r1).toHaveLength(1);
    expect(r1[0].description).toBe('A');
  });

  it('getTransactions filtra por type', async () => {
    const user = await createTestUser();
    await FinancialService.createTransaction(user.id, { type: 'DESPESA', description: 'D', value: 10, date: '2026-01-01' });
    await FinancialService.createTransaction(user.id, { type: 'RECEITA', description: 'R', value: 20, date: '2026-01-01' });

    const despesas = await FinancialService.getTransactions(user.id, { type: 'DESPESA' });
    expect(despesas).toHaveLength(1);
    expect(despesas[0].type).toBe('DESPESA');
  });

  it('getTransactions filtra por intervalo de datas', async () => {
    const user = await createTestUser();
    await FinancialService.createTransaction(user.id, { type: 'DESPESA', description: 'Jan', value: 10, date: '2026-01-15' });
    await FinancialService.createTransaction(user.id, { type: 'DESPESA', description: 'Fev', value: 10, date: '2026-02-15' });
    await FinancialService.createTransaction(user.id, { type: 'DESPESA', description: 'Mar', value: 10, date: '2026-03-15' });

    const r = await FinancialService.getTransactions(user.id, {
      date_from: '2026-02-01',
      date_to: '2026-02-28',
    });
    expect(r).toHaveLength(1);
    expect(r[0].description).toBe('Fev');
  });

  it('updateTransaction atualiza apenas campos enviados', async () => {
    const user = await createTestUser();
    const t = await FinancialService.createTransaction(user.id, {
      type: 'DESPESA',
      description: 'orig',
      value: 100,
      date: '2026-01-01',
      category: 'cat-orig',
    });

    const updated = await FinancialService.updateTransaction(user.id, t.id, {
      description: 'novo',
      value: 200,
    });
    expect(updated.description).toBe('novo');
    expect(Number(updated.value)).toBe(200);
    expect(updated.category).toBe('cat-orig');
  });

  it('updateTransaction rejeita transação de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const t = await FinancialService.createTransaction(u1.id, {
      type: 'DESPESA',
      description: 'x',
      value: 10,
      date: '2026-01-01',
    });
    await expect(
      FinancialService.updateTransaction(u2.id, t.id, { description: 'hack' })
    ).rejects.toThrow('Transação não encontrada');
  });

  it('deleteTransaction remove do próprio tenant', async () => {
    const user = await createTestUser();
    const t = await FinancialService.createTransaction(user.id, {
      type: 'DESPESA',
      description: 'x',
      value: 10,
      date: '2026-01-01',
    });
    await FinancialService.deleteTransaction(user.id, t.id);
    const after = await prisma.financialTransaction.findUnique({ where: { id: t.id } });
    expect(after).toBeNull();
  });

  it('deleteTransaction rejeita de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const t = await FinancialService.createTransaction(u1.id, {
      type: 'DESPESA',
      description: 'x',
      value: 10,
      date: '2026-01-01',
    });
    await expect(FinancialService.deleteTransaction(u2.id, t.id)).rejects.toThrow('Transação não encontrada');
    const still = await prisma.financialTransaction.findUnique({ where: { id: t.id } });
    expect(still).toBeTruthy();
  });
});

describe('FinancialService — despesas recorrentes', () => {
  it('createRecurringExpense aceita as 4 frequências MENSAL/SEMANAL/QUINZENAL/ANUAL', async () => {
    const user = await createTestUser();
    for (const freq of ['MENSAL', 'SEMANAL', 'QUINZENAL', 'ANUAL']) {
      const r = await FinancialService.createRecurringExpense(user.id, {
        description: `Despesa ${freq}`,
        value: 50,
        frequency: freq,
        startDate: '2026-01-01',
      });
      expect(r.frequency).toBe(freq);
      expect(r.active).toBe(true);
    }
  });

  it('persiste endDate e dayOfMonth quando informados', async () => {
    const user = await createTestUser();
    const r = await FinancialService.createRecurringExpense(user.id, {
      description: 'Aluguel',
      value: 2500,
      frequency: 'MENSAL',
      dayOfMonth: 10,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      category: 'Imóvel',
      notes: 'reajuste anual em janeiro',
    });
    expect(r.dayOfMonth).toBe(10);
    expect(r.endDate).toBeInstanceOf(Date);
    expect(r.category).toBe('Imóvel');
    expect(r.notes).toBe('reajuste anual em janeiro');
  });

  it('getRecurringExpenses isola por tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await FinancialService.createRecurringExpense(u1.id, {
      description: 'A',
      value: 10,
      frequency: 'MENSAL',
      startDate: '2026-01-01',
    });
    await FinancialService.createRecurringExpense(u2.id, {
      description: 'B',
      value: 20,
      frequency: 'MENSAL',
      startDate: '2026-01-01',
    });

    const r1 = await FinancialService.getRecurringExpenses(u1.id);
    expect(r1).toHaveLength(1);
    expect(r1[0].description).toBe('A');
  });

  it('updateRecurringExpense permite desativar (active = false)', async () => {
    const user = await createTestUser();
    const r = await FinancialService.createRecurringExpense(user.id, {
      description: 'X',
      value: 100,
      frequency: 'MENSAL',
      startDate: '2026-01-01',
    });
    const updated = await FinancialService.updateRecurringExpense(user.id, r.id, { active: false });
    expect(updated.active).toBe(false);
  });

  it('updateRecurringExpense rejeita despesa de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const r = await FinancialService.createRecurringExpense(u1.id, {
      description: 'X',
      value: 100,
      frequency: 'MENSAL',
      startDate: '2026-01-01',
    });
    await expect(
      FinancialService.updateRecurringExpense(u2.id, r.id, { active: false })
    ).rejects.toThrow('Despesa recorrente não encontrada');
  });

  it('deleteRecurringExpense respeita ownership', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const r = await FinancialService.createRecurringExpense(u1.id, {
      description: 'X',
      value: 100,
      frequency: 'MENSAL',
      startDate: '2026-01-01',
    });
    await expect(FinancialService.deleteRecurringExpense(u2.id, r.id)).rejects.toThrow(
      'Despesa recorrente não encontrada'
    );
    await FinancialService.deleteRecurringExpense(u1.id, r.id);
    const after = await prisma.recurringExpense.findUnique({ where: { id: r.id } });
    expect(after).toBeNull();
  });
});
