import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ProductCollectionService } from './productCollectionService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('ProductCollectionService', () => {
  it('create cria coleção e rejeita duplicata por tenant', async () => {
    const user = await createTestUser();
    const c = await ProductCollectionService.create(user.id, 'Verão 2026');
    expect(c.name).toBe('Verão 2026');
    await expect(ProductCollectionService.create(user.id, 'Verão 2026')).rejects.toThrow('Coleção já existe');
  });

  it('mesmo nome é permitido em tenants distintos', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await ProductCollectionService.create(u1.id, 'Inverno');
    const c2 = await ProductCollectionService.create(u2.id, 'Inverno');
    expect(c1.id).not.toBe(c2.id);
  });

  it('getByUser isola por tenant e ordena por nome', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await ProductCollectionService.create(u1.id, 'Zeta');
    await ProductCollectionService.create(u1.id, 'Alfa');
    await ProductCollectionService.create(u2.id, 'Beta');
    const r = await ProductCollectionService.getByUser(u1.id);
    expect(r.map((c) => c.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('delete respeita ownership', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c = await ProductCollectionService.create(u1.id, 'X');
    await expect(ProductCollectionService.delete(u2.id, c.id)).rejects.toThrow('Coleção não encontrada');
    await ProductCollectionService.delete(u1.id, c.id);
    const after = await prisma.productCollection.findUnique({ where: { id: c.id } });
    expect(after).toBeNull();
  });
});
