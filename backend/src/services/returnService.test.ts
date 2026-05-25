import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ReturnService } from './returnService';
import { SaleService } from './saleService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser, createTestClient, createTestProduct } from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

/**
 * Cria uma venda padrão para testar devoluções. Retorna a venda completa
 * com items (precisamos do saleItemId para criar a devolução).
 */
async function createSaleFixture(opts: {
  userId: number;
  clientId: number;
  productId: number;
  unitPrice?: number;
  quantity?: number;
}) {
  const unitPrice = opts.unitPrice ?? 100;
  const quantity = opts.quantity ?? 1;
  const total = unitPrice * quantity;
  const venda = await SaleService.createSale(opts.userId, {
    client_id: opts.clientId,
    seller_id: null,
    items: [{ product_id: opts.productId, quantity, unit_price: unitPrice }],
    payments: [{ method: 'cash', label: 'Dinheiro', amount: total }],
    subtotal: total,
    discount: 0,
    surcharge: 0,
    total,
  });
  return venda!;
}

describe('ReturnService.createReturn — validações', () => {
  it('rejeita resolutionMethod inválido', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
    });

    await expect(
      ReturnService.createReturn(user.id, {
        saleId: venda.id,
        items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
        resolutionMethod: 'INVALIDO' as any,
      })
    ).rejects.toMatchObject({ status: 400, message: 'Método de devolução inválido' });
  });

  it('rejeita lista de items vazia', async () => {
    const user = await createTestUser();
    await expect(
      ReturnService.createReturn(user.id, {
        saleId: 1,
        items: [],
        resolutionMethod: 'TROCA',
      })
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('Selecione ao menos um produto') });
  });

  it('rejeita venda de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const cliente = await createTestClient(u1.id);
    const produto = await createTestProduct(u1.id);
    const venda = await createSaleFixture({
      userId: u1.id,
      clientId: cliente.id,
      productId: produto.id,
    });

    await expect(
      ReturnService.createReturn(u2.id, {
        saleId: venda.id,
        items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
        resolutionMethod: 'TROCA',
      })
    ).rejects.toMatchObject({ status: 404, message: 'Venda não encontrada' });
  });

  it('rejeita clientId destinatário de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await createTestClient(u1.id);
    const cOutro = await createTestClient(u2.id);
    const produto = await createTestProduct(u1.id);
    const venda = await createSaleFixture({
      userId: u1.id,
      clientId: c1.id,
      productId: produto.id,
    });

    await expect(
      ReturnService.createReturn(u1.id, {
        saleId: venda.id,
        items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
        resolutionMethod: 'GERAR_CREDITO',
        clientId: cOutro.id,
      })
    ).rejects.toMatchObject({ status: 400, message: 'Cliente inválido' });
  });

  it('rejeita GERAR_CREDITO sem cliente destinatário', async () => {
    const user = await createTestUser();
    const produto = await createTestProduct(user.id);
    // Cria venda SEM cliente — usando direto via Prisma (SaleService exige client_id).
    const venda = await prisma.sale.create({
      data: {
        userId: user.id,
        totalValue: 100,
        subtotal: 100,
        saleDate: new Date(),
        items: { create: [{ productId: produto.id, quantity: 1, unitPrice: 100, subtotal: 100 }] },
      },
      include: { items: true },
    });

    await expect(
      ReturnService.createReturn(user.id, {
        saleId: venda.id,
        items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
        resolutionMethod: 'GERAR_CREDITO',
      })
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Cliente é obrigatório para gerar crédito'),
    });
  });

  it('rejeita saleItemId que não pertence à venda', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
    });

    await expect(
      ReturnService.createReturn(user.id, {
        saleId: venda.id,
        items: [{ saleItemId: 99999, quantity: 1 }],
        resolutionMethod: 'TROCA',
      })
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('Item de venda não encontrado') });
  });

  it('rejeita quantity inválida (0, negativa ou fracionada)', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      quantity: 3,
    });

    for (const invalid of [0, -1, 1.5]) {
      await expect(
        ReturnService.createReturn(user.id, {
          saleId: venda.id,
          items: [{ saleItemId: venda.items[0].id, quantity: invalid }],
          resolutionMethod: 'TROCA',
        })
      ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('Quantidade de devolução inválida') });
    }
  });

  it('rejeita quantity > quantidade vendida', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10 });
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      quantity: 2,
    });

    await expect(
      ReturnService.createReturn(user.id, {
        saleId: venda.id,
        items: [{ saleItemId: venda.items[0].id, quantity: 5 }],
        resolutionMethod: 'TROCA',
      })
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('maior que vendida') });
  });

  it('rejeita devolução cumulativa que excede o saldo devolvível', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10 });
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      quantity: 3,
    });

    // Primeira devolução de 2 unidades
    await ReturnService.createReturn(user.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 2 }],
      resolutionMethod: 'TROCA',
    });

    // Tentativa de devolver mais 2 (total 4 > vendido 3)
    await expect(
      ReturnService.createReturn(user.id, {
        saleId: venda.id,
        items: [{ saleItemId: venda.items[0].id, quantity: 2 }],
        resolutionMethod: 'TROCA',
      })
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('excede o saldo devolvível'),
    });
  });
});

describe('ReturnService.createReturn — TROCA', () => {
  it('cria Returns e devolve ao estoque, sem mexer em financeiro nem saldo', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 50 });
    const produto = await createTestProduct(user.id, { quantityStock: 10, priceSale: 100 });
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      quantity: 2,
      unitPrice: 100,
    });

    // Estoque pós-venda: 10 - 2 = 8
    const result = await ReturnService.createReturn(user.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      resolutionMethod: 'TROCA',
    });

    expect(result.resolutionMethod).toBe('TROCA');
    expect(result.totalRefund).toBe(100);
    expect(result.financialTransactionId).toBeNull();

    const produtoAtualizado = await prisma.product.findUnique({ where: { id: produto.id } });
    expect(produtoAtualizado!.quantityStock).toBe(9);

    const clienteAtualizado = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAtualizado!.creditBalance)).toBe(50);

    // Apenas a FT da venda original deve existir (se houver) — TROCA não cria FT.
    // Nesse cenário a venda foi em dinheiro, sem FT, então conta zero.
    const fts = await prisma.financialTransaction.count({ where: { userId: user.id } });
    expect(fts).toBe(0);
  });
});

describe('ReturnService.createReturn — DEVOLVER_PAGAMENTO', () => {
  it('cria Returns, devolve estoque e gera FT DESPESA "Devolução de venda"', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10, priceSale: 100 });
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      quantity: 2,
      unitPrice: 100,
    });

    const result = await ReturnService.createReturn(user.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 2 }],
      resolutionMethod: 'DEVOLVER_PAGAMENTO',
      observation: 'cliente arrependeu',
    });

    expect(result.totalRefund).toBe(200);
    expect(result.financialTransactionId).toBeGreaterThan(0);

    const produtoAtualizado = await prisma.product.findUnique({ where: { id: produto.id } });
    expect(produtoAtualizado!.quantityStock).toBe(10);

    const ft = await prisma.financialTransaction.findUnique({
      where: { id: result.financialTransactionId! },
    });
    expect(ft!.type).toBe('DESPESA');
    expect(ft!.category).toBe('Devolução de venda');
    expect(Number(ft!.value)).toBe(200);
    expect(ft!.clientId).toBe(cliente.id);
    expect(ft!.notes).toBe('cliente arrependeu');

    // Saldo não muda em DEVOLVER_PAGAMENTO
    const clienteAtualizado = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAtualizado!.creditBalance)).toBe(0);
  });
});

describe('ReturnService.createReturn — GERAR_CREDITO', () => {
  it('cria Returns, devolve estoque, gera FT DESPESA e incrementa creditBalance do cliente', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 30 });
    const produto = await createTestProduct(user.id, { quantityStock: 10, priceSale: 150 });
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      quantity: 1,
      unitPrice: 150,
    });

    const result = await ReturnService.createReturn(user.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      resolutionMethod: 'GERAR_CREDITO',
    });

    expect(result.totalRefund).toBe(150);
    expect(result.clientId).toBe(cliente.id);

    const clienteAtualizado = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAtualizado!.creditBalance)).toBe(180);

    const ft = await prisma.financialTransaction.findUnique({
      where: { id: result.financialTransactionId! },
    });
    expect(ft!.type).toBe('DESPESA');
    expect(ft!.category).toBe('Crédito de devolução');
    expect(Number(ft!.value)).toBe(150);
  });

  it('fallback: usa cliente da venda quando clientId não é enviado', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
    });

    const result = await ReturnService.createReturn(user.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      resolutionMethod: 'GERAR_CREDITO',
    });

    expect(result.clientId).toBe(cliente.id);
    const clienteAtualizado = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAtualizado!.creditBalance)).toBe(100);
  });

  it('clientId explícito sobrescreve o cliente da venda (transferindo crédito a terceiro)', async () => {
    const user = await createTestUser();
    const clienteVenda = await createTestClient(user.id);
    const outroCliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: clienteVenda.id,
      productId: produto.id,
    });

    const result = await ReturnService.createReturn(user.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      resolutionMethod: 'GERAR_CREDITO',
      clientId: outroCliente.id,
    });

    expect(result.clientId).toBe(outroCliente.id);

    const credVenda = await prisma.client.findUnique({ where: { id: clienteVenda.id } });
    const credOutro = await prisma.client.findUnique({ where: { id: outroCliente.id } });
    expect(Number(credVenda!.creditBalance)).toBe(0);
    expect(Number(credOutro!.creditBalance)).toBe(100);
  });
});

describe('ReturnService.createReturn — valor reembolsado usa unitPrice histórico', () => {
  it('refundValue = unitPrice da venda × quantity (mesmo que preço do produto tenha mudado)', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { priceSale: 100, quantityStock: 10 });

    // Vende a R$ 80 (preço promocional)
    const venda = await createSaleFixture({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 80,
      quantity: 2,
    });

    // Preço do produto sobe pra R$ 120 depois da venda
    await prisma.product.update({ where: { id: produto.id }, data: { priceSale: 120 } });

    const result = await ReturnService.createReturn(user.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      resolutionMethod: 'DEVOLVER_PAGAMENTO',
    });

    // Reembolsa 80, não 120
    expect(result.totalRefund).toBe(80);
  });
});

describe('ReturnService.getReturnsBySale', () => {
  it('isolamento por tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const cliente = await createTestClient(u1.id);
    const produto = await createTestProduct(u1.id);
    const venda = await createSaleFixture({
      userId: u1.id,
      clientId: cliente.id,
      productId: produto.id,
    });
    await ReturnService.createReturn(u1.id, {
      saleId: venda.id,
      items: [{ saleItemId: venda.items[0].id, quantity: 1 }],
      resolutionMethod: 'TROCA',
    });

    await expect(ReturnService.getReturnsBySale(u2.id, venda.id)).rejects.toMatchObject({
      status: 404,
      message: 'Venda não encontrada',
    });

    const proprias = await ReturnService.getReturnsBySale(u1.id, venda.id);
    expect(proprias).toHaveLength(1);
  });
});
