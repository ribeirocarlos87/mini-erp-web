import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SupplierService } from './supplierService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('SupplierService', () => {
  it('create grava nome obrigatório e demais campos opcionais como null', async () => {
    const user = await createTestUser();
    const s = await SupplierService.create(user.id, { name: 'Fornecedor X' });
    expect(s.name).toBe('Fornecedor X');
    expect(s.userId).toBe(user.id);
    expect(s.cnpj).toBeNull();
    expect(s.email).toBeNull();
    expect(s.phone).toBeNull();
  });

  it('create persiste cnpj, email e phone quando enviados', async () => {
    const user = await createTestUser();
    const s = await SupplierService.create(user.id, {
      name: 'Y',
      cnpj: '00000000000191',
      email: 'fornecedor@test.local',
      phone: '1133334444',
    });
    expect(s.cnpj).toBe('00000000000191');
    expect(s.email).toBe('fornecedor@test.local');
    expect(s.phone).toBe('1133334444');
  });

  it('getByUser isola por tenant e ordena por nome', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await SupplierService.create(u1.id, { name: 'Zeta' });
    await SupplierService.create(u1.id, { name: 'Alfa' });
    await SupplierService.create(u2.id, { name: 'Beta' });

    const r = await SupplierService.getByUser(u1.id);
    expect(r).toHaveLength(2);
    expect(r.map((s) => s.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('delete remove do próprio tenant', async () => {
    const user = await createTestUser();
    const s = await SupplierService.create(user.id, { name: 'X' });
    await SupplierService.delete(user.id, s.id);
    const after = await prisma.supplier.findUnique({ where: { id: s.id } });
    expect(after).toBeNull();
  });

  it('delete rejeita fornecedor de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const s = await SupplierService.create(u1.id, { name: 'X' });
    await expect(SupplierService.delete(u2.id, s.id)).rejects.toThrow('Fornecedor não encontrado');
    const still = await prisma.supplier.findUnique({ where: { id: s.id } });
    expect(still).toBeTruthy();
  });
});
