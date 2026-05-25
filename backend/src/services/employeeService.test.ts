import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { EmployeeService } from './employeeService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('EmployeeService', () => {
  it('create grava nome obrigatório e demais campos opcionais como null; active default true', async () => {
    const user = await createTestUser();
    const e = await EmployeeService.create(user.id, { name: 'Vendedor 1' });
    expect(e.name).toBe('Vendedor 1');
    expect(e.userId).toBe(user.id);
    expect(e.email).toBeNull();
    expect(e.role).toBeNull();
    expect(e.active).toBe(true);
  });

  it('getByUser retorna apenas funcionários ATIVOS do tenant, ordenados por nome', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const ativo1 = await EmployeeService.create(u1.id, { name: 'Zeta' });
    const ativo2 = await EmployeeService.create(u1.id, { name: 'Alfa' });
    const inativo = await EmployeeService.create(u1.id, { name: 'Inativo' });
    await EmployeeService.update(u1.id, inativo.id, { active: false });
    await EmployeeService.create(u2.id, { name: 'OutroTenant' });

    const r = await EmployeeService.getByUser(u1.id);
    expect(r.map((e) => e.name)).toEqual(['Alfa', 'Zeta']);
    expect(r.map((e) => e.id)).not.toContain(inativo.id);
  });

  it('update atualiza campos enviados e respeita ownership', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const e = await EmployeeService.create(u1.id, { name: 'A', role: 'Vendedor' });

    const updated = await EmployeeService.update(u1.id, e.id, { role: 'Gerente' });
    expect(updated.role).toBe('Gerente');
    expect(updated.name).toBe('A');

    await expect(EmployeeService.update(u2.id, e.id, { name: 'hack' })).rejects.toThrow(
      'Vendedor não encontrado'
    );
  });

  it('delete remove do próprio tenant e rejeita outros', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const e = await EmployeeService.create(u1.id, { name: 'X' });

    await expect(EmployeeService.delete(u2.id, e.id)).rejects.toThrow('Vendedor não encontrado');
    await EmployeeService.delete(u1.id, e.id);
    const after = await prisma.employee.findUnique({ where: { id: e.id } });
    expect(after).toBeNull();
  });
});
