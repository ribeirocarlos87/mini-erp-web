import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ClientService } from './clientService';
import { SaleService } from './saleService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser, createTestClient, createTestProduct } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('ClientService.createClient', () => {
  it('cria cliente com nome obrigatório e demais campos opcionais nulos', async () => {
    const user = await createTestUser();
    const c = await ClientService.createClient(user.id, { name: 'Fulano' });
    expect(c.name).toBe('Fulano');
    expect(c.userId).toBe(user.id);
    expect(c.cpfCnpj).toBeNull();
    expect(c.email).toBeNull();
    expect(Number(c.creditBalance)).toBe(0);
  });

  it('persiste endereço, contato e classificação', async () => {
    const user = await createTestUser();
    const c = await ClientService.createClient(user.id, {
      name: 'Beltrano',
      personType: 'PF',
      cpfCnpj: '12345678900',
      gender: 'M',
      birthDate: '1990-01-15',
      phone: '11999998888',
      whatsapp: '11999998888',
      instagram: '@beltrano',
      email: 'beltrano@test.local',
      category: 'VIP',
      zipCode: '01001000',
      street: 'Rua A',
      number: '100',
      complement: 'Apto 5',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      observations: 'cliente fiel',
    });
    expect(c.personType).toBe('PF');
    expect(c.cpfCnpj).toBe('12345678900');
    expect(c.city).toBe('São Paulo');
    expect(c.state).toBe('SP');
    expect(c.category).toBe('VIP');
  });
});

describe('ClientService.getClientsByUser', () => {
  it('isolamento por tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await createTestClient(u1.id, { name: 'A' });
    await createTestClient(u1.id, { name: 'B' });
    await createTestClient(u2.id, { name: 'C' });

    const r1 = await ClientService.getClientsByUser(u1.id);
    expect(r1.clients).toHaveLength(2);
    expect(r1.total).toBe(2);

    const r2 = await ClientService.getClientsByUser(u2.id);
    expect(r2.clients).toHaveLength(1);
    expect(r2.clients[0].name).toBe('C');
  });

  it('paginação respeita limit e offset', async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) {
      await createTestClient(user.id, { name: `Cli ${i}` });
    }
    const p1 = await ClientService.getClientsByUser(user.id, 2, 0);
    const p2 = await ClientService.getClientsByUser(user.id, 2, 2);
    expect(p1.clients).toHaveLength(2);
    expect(p2.clients).toHaveLength(2);
    expect(p1.total).toBe(5);
  });

  it('retorna creditBalance como Decimal', async () => {
    const user = await createTestUser();
    await createTestClient(user.id, { creditBalance: 175.5 });
    const { clients } = await ClientService.getClientsByUser(user.id);
    expect(Number(clients[0].creditBalance)).toBe(175.5);
  });
});

describe('ClientService.getClientById', () => {
  it('retorna cliente do próprio tenant', async () => {
    const user = await createTestUser();
    const c = await createTestClient(user.id, { name: 'X' });
    const fetched = await ClientService.getClientById(user.id, c.id);
    expect(fetched.id).toBe(c.id);
    expect(fetched.name).toBe('X');
  });

  it('rejeita cliente de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c = await createTestClient(u1.id);
    await expect(ClientService.getClientById(u2.id, c.id)).rejects.toThrow('Client not found');
  });
});

describe('ClientService.updateClient', () => {
  it('atualiza apenas campos enviados, mantém o resto', async () => {
    const user = await createTestUser();
    const c = await ClientService.createClient(user.id, {
      name: 'Antigo',
      email: 'antigo@test.local',
      city: 'São Paulo',
    });

    const updated = await ClientService.updateClient(user.id, c.id, { name: 'Novo Nome' });
    expect(updated.name).toBe('Novo Nome');
    expect(updated.email).toBe('antigo@test.local');
    expect(updated.city).toBe('São Paulo');
  });

  it('permite zerar campo passando string vazia ou null', async () => {
    const user = await createTestUser();
    const c = await ClientService.createClient(user.id, { name: 'A', email: 'x@test.local' });
    const updated = await ClientService.updateClient(user.id, c.id, { email: '' });
    // Tipo aceita string vazia; backend grava conforme enviado.
    expect(updated.email).toBe('');
  });

  it('rejeita update em cliente de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c = await createTestClient(u1.id);
    await expect(
      ClientService.updateClient(u2.id, c.id, { name: 'hack' })
    ).rejects.toThrow('Client not found');
  });
});

describe('ClientService.deleteClient', () => {
  it('remove cliente do próprio tenant', async () => {
    const user = await createTestUser();
    const c = await createTestClient(user.id);
    await ClientService.deleteClient(user.id, c.id);
    await expect(ClientService.getClientById(user.id, c.id)).rejects.toThrow('Client not found');
  });

  it('rejeita delete em cliente de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c = await createTestClient(u1.id);
    await expect(ClientService.deleteClient(u2.id, c.id)).rejects.toThrow('Client not found');
    // Continua existindo para o tenant verdadeiro
    const still = await ClientService.getClientById(u1.id, c.id);
    expect(still.id).toBe(c.id);
  });
});

describe('ClientService.getPurchaseHistory', () => {
  async function placeSale(userId: number, clientId: number, productId: number, unitPrice: number, quantity = 1) {
    return SaleService.createSale(userId, {
      client_id: clientId,
      seller_id: null,
      items: [{ product_id: productId, quantity, unit_price: unitPrice }],
      payments: [{ method: 'cash', label: 'Dinheiro', amount: unitPrice * quantity }],
      subtotal: unitPrice * quantity,
      discount: 0,
      surcharge: 0,
      total: unitPrice * quantity,
    });
  }

  it('retorna vendas + stats (totalSales, totalSpent, averageTicket, first/last)', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });

    await placeSale(user.id, cliente.id, produto.id, 100);
    await placeSale(user.id, cliente.id, produto.id, 200);
    await placeSale(user.id, cliente.id, produto.id, 300);

    const r = await ClientService.getPurchaseHistory(user.id, cliente.id);
    expect(r.total).toBe(3);
    expect(r.stats.totalSales).toBe(3);
    expect(r.stats.totalSpent).toBe(600);
    expect(r.stats.averageTicket).toBe(200);
    expect(r.stats.firstPurchaseDate).toBeInstanceOf(Date);
    expect(r.stats.lastPurchaseDate).toBeInstanceOf(Date);
    expect(r.sales).toHaveLength(3);
    // Include de items/payments/seller
    expect(r.sales[0].items).toBeTruthy();
    expect(r.sales[0].payments).toBeTruthy();
  });

  it('cliente sem vendas: stats zerados, first/last nulos', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const r = await ClientService.getPurchaseHistory(user.id, cliente.id);
    expect(r.total).toBe(0);
    expect(r.stats.totalSpent).toBe(0);
    expect(r.stats.averageTicket).toBe(0);
    expect(r.stats.firstPurchaseDate).toBeNull();
    expect(r.stats.lastPurchaseDate).toBeNull();
  });

  it('rejeita histórico de cliente de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c = await createTestClient(u1.id);
    await expect(ClientService.getPurchaseHistory(u2.id, c.id)).rejects.toThrow('Client not found');
  });

  it('limit é clampeado entre 1 e 100', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });
    for (let i = 0; i < 3; i++) await placeSale(user.id, cliente.id, produto.id, 50);

    const r1 = await ClientService.getPurchaseHistory(user.id, cliente.id, 0);
    expect(r1.sales).toHaveLength(1);
    const r2 = await ClientService.getPurchaseHistory(user.id, cliente.id, 9999);
    expect(r2.sales).toHaveLength(3);
  });
});
