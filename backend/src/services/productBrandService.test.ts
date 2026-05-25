import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ProductBrandService } from './productBrandService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('ProductBrandService', () => {
  it('create cria marca e rejeita duplicata por tenant', async () => {
    const user = await createTestUser();
    const b = await ProductBrandService.create(user.id, 'Nike');
    expect(b.name).toBe('Nike');
    await expect(ProductBrandService.create(user.id, 'Nike')).rejects.toThrow('Marca já existe');
  });

  it('mesmo nome é permitido em tenants distintos', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const b1 = await ProductBrandService.create(u1.id, 'Adidas');
    const b2 = await ProductBrandService.create(u2.id, 'Adidas');
    expect(b1.id).not.toBe(b2.id);
  });

  it('getByUser isola por tenant e ordena por nome', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await ProductBrandService.create(u1.id, 'Zeta');
    await ProductBrandService.create(u1.id, 'Alfa');
    await ProductBrandService.create(u2.id, 'Beta');
    const r = await ProductBrandService.getByUser(u1.id);
    expect(r.map((b) => b.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('delete respeita ownership', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const b = await ProductBrandService.create(u1.id, 'X');
    await expect(ProductBrandService.delete(u2.id, b.id)).rejects.toThrow('Marca não encontrada');
    await ProductBrandService.delete(u1.id, b.id);
    const after = await prisma.productBrand.findUnique({ where: { id: b.id } });
    expect(after).toBeNull();
  });
});
