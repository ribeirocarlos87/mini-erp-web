import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { cleanDatabase, disconnectDatabase, prisma } from './db';
import { createTestUser, createTestClient, createTestProduct, createTestCategory } from './factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('infra de teste — banco isolado', () => {
  it('conecta no banco de teste configurado', async () => {
    const rows = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
    expect(rows[0].current_database).toBe('mini_erp_test');
  });

  it('migrations aplicadas: tabelas principais existem', async () => {
    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const names = rows.map((r) => r.tablename);
    expect(names).toContain('users');
    expect(names).toContain('products');
    expect(names).toContain('sales');
    expect(names).toContain('returns');
    expect(names).toContain('clients');
  });

  it('cleanDatabase remove dados entre testes (parte 1: insere)', async () => {
    const user = await createTestUser();
    expect(user.id).toBeGreaterThan(0);
    const count = await prisma.user.count();
    expect(count).toBe(1);
  });

  it('cleanDatabase remove dados entre testes (parte 2: banco deve estar limpo)', async () => {
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });
});

describe('factories', () => {
  it('createTestUser cria usuário com hash de senha', async () => {
    const user = await createTestUser({ email: 'fixture@test.local', name: 'Fixture' });
    expect(user.email).toBe('fixture@test.local');
    expect(user.name).toBe('Fixture');
    expect(user.passwordHash).not.toBe('TestPassword123');
    expect(user.passwordHash.startsWith('$2')).toBe(true);
  });

  it('createTestProduct vincula ao tenant', async () => {
    const user = await createTestUser();
    const category = await createTestCategory(user.id);
    const product = await createTestProduct(user.id, { categoryId: category.id, priceSale: 199.9 });
    expect(product.userId).toBe(user.id);
    expect(product.categoryId).toBe(category.id);
    expect(Number(product.priceSale)).toBe(199.9);
  });

  it('createTestClient suporta saldo inicial de crédito', async () => {
    const user = await createTestUser();
    const client = await createTestClient(user.id, { creditBalance: 250 });
    expect(Number(client.creditBalance)).toBe(250);
  });
});
