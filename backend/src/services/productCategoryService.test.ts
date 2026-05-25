import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ProductCategoryService } from './productCategoryService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('ProductCategoryService', () => {
  it('create cria categoria por tenant', async () => {
    const user = await createTestUser();
    const c = await ProductCategoryService.create(user.id, 'Camisetas');
    expect(c.name).toBe('Camisetas');
    expect(c.userId).toBe(user.id);
  });

  it('create rejeita duplicata no mesmo tenant (P2002 → mensagem clara)', async () => {
    const user = await createTestUser();
    await ProductCategoryService.create(user.id, 'Vinho');
    await expect(ProductCategoryService.create(user.id, 'Vinho')).rejects.toThrow('Categoria já existe');
  });

  it('create permite mesmo nome em tenants diferentes', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await ProductCategoryService.create(u1.id, 'Calçados');
    const c2 = await ProductCategoryService.create(u2.id, 'Calçados');
    expect(c1.id).not.toBe(c2.id);
    expect(c1.userId).toBe(u1.id);
    expect(c2.userId).toBe(u2.id);
  });

  it('getByUser isola por tenant e ordena por nome', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await ProductCategoryService.create(u1.id, 'Zeta');
    await ProductCategoryService.create(u1.id, 'Alfa');
    await ProductCategoryService.create(u2.id, 'Beta');

    const r = await ProductCategoryService.getByUser(u1.id);
    expect(r.map((c) => c.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('delete remove do próprio tenant e rejeita outros', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c = await ProductCategoryService.create(u1.id, 'X');
    await expect(ProductCategoryService.delete(u2.id, c.id)).rejects.toThrow('Categoria não encontrada');
    await ProductCategoryService.delete(u1.id, c.id);
    const after = await prisma.productCategory.findUnique({ where: { id: c.id } });
    expect(after).toBeNull();
  });
});
