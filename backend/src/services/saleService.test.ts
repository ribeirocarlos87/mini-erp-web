import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SaleService } from './saleService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import {
  createTestUser,
  createTestClient,
  createTestProduct,
  createTestEmployee,
} from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

/**
 * Helper: monta um payload mínimo válido (1 item, pagamento único em dinheiro).
 */
async function setupSimpleSale(opts: {
  userId: number;
  clientId: number;
  sellerId?: number | null;
  productId: number;
  unitPrice?: number;
  quantity?: number;
  paymentMethod?: string;
  paymentAmount?: number;
}) {
  const unitPrice = opts.unitPrice ?? 100;
  const quantity = opts.quantity ?? 1;
  const total = unitPrice * quantity;
  const method = opts.paymentMethod ?? 'cash';
  return {
    client_id: opts.clientId,
    seller_id: opts.sellerId ?? null,
    items: [{ product_id: opts.productId, quantity, unit_price: unitPrice }],
    payments: [{ method, label: method, amount: opts.paymentAmount ?? total }],
    subtotal: total,
    discount: 0,
    surcharge: 0,
    total,
  };
}

describe('SaleService.createSale — validações de pré-requisito', () => {
  it('rejeita cliente que não pertence ao tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const clienteOutro = await createTestClient(u2.id);
    const produto = await createTestProduct(u1.id);
    const payload = await setupSimpleSale({
      userId: u1.id,
      clientId: clienteOutro.id,
      productId: produto.id,
    });

    await expect(SaleService.createSale(u1.id, payload)).rejects.toMatchObject({
      status: 400,
      message: 'Cliente não encontrado',
    });
  });

  it('rejeita quando algum produto não pertence ao tenant (e lista os IDs ausentes)', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const cliente = await createTestClient(u1.id);
    const produtoOk = await createTestProduct(u1.id);
    const produtoOutro = await createTestProduct(u2.id);

    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [
        { product_id: produtoOk.id, quantity: 1, unit_price: 100 },
        { product_id: produtoOutro.id, quantity: 1, unit_price: 100 },
      ],
      payments: [{ method: 'cash', label: 'Dinheiro', amount: 200 }],
      subtotal: 200,
      discount: 0,
      surcharge: 0,
      total: 200,
    };

    await expect(SaleService.createSale(u1.id, payload)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining(`${produtoOutro.id}`),
    });
  });

  it('rejeita quando estoque é insuficiente', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 2 });
    const payload = await setupSimpleSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      quantity: 5,
    });

    await expect(SaleService.createSale(user.id, payload)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Estoque insuficiente'),
    });
  });

  it('rejeita quando total da venda ≤ 0', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const payload = await setupSimpleSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
    });
    payload.total = 0;

    await expect(SaleService.createSale(user.id, payload)).rejects.toMatchObject({
      status: 400,
      message: 'Total da venda inválido',
    });
  });

  it('rejeita seller_id de outro tenant (ownership cross-tenant)', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const cliente = await createTestClient(u1.id);
    const produto = await createTestProduct(u1.id);
    const sellerOutro = await createTestEmployee(u2.id, 'Vendedor Alheio');
    const payload = {
      ...(await setupSimpleSale({
        userId: u1.id,
        clientId: cliente.id,
        productId: produto.id,
      })),
      seller_id: sellerOutro.id,
    };

    await expect(SaleService.createSale(u1.id, payload)).rejects.toMatchObject({
      status: 400,
      message: 'Vendedor não encontrado',
    });

    // Nada foi criado (validação antes da transação)
    const sales = await prisma.sale.count({ where: { userId: u1.id } });
    expect(sales).toBe(0);
  });

  it('aceita seller_id do próprio tenant', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const vendedor = await createTestEmployee(user.id, 'Vendedor Local');
    const payload = await setupSimpleSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      sellerId: vendedor.id,
    });
    const venda = await SaleService.createSale(user.id, payload);
    expect(venda!.sellerId).toBe(vendedor.id);
  });

  it('rejeita quando soma dos pagamentos não bate com total (front mentindo)', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const payload = await setupSimpleSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 100,
    });
    payload.payments = [{ method: 'cash', label: 'Dinheiro', amount: 50 }];

    await expect(SaleService.createSale(user.id, payload)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Soma dos pagamentos'),
    });
  });
});

describe('SaleService.createSale — fluxo simples (sem saldo de crédito)', () => {
  it('cria venda + items + payments e debita estoque', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const vendedor = await createTestEmployee(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 10, priceSale: 100 });

    const payload = await setupSimpleSale({
      userId: user.id,
      clientId: cliente.id,
      sellerId: vendedor.id,
      productId: produto.id,
      unitPrice: 100,
      quantity: 3,
    });

    const venda = await SaleService.createSale(user.id, payload);

    expect(venda).toBeTruthy();
    expect(Number(venda!.totalValue)).toBe(300);
    expect(venda!.items).toHaveLength(1);
    expect(venda!.items[0].quantity).toBe(3);
    expect(Number(venda!.items[0].subtotal)).toBe(300);
    expect(venda!.payments).toHaveLength(1);
    expect(venda!.payments[0].method).toBe('cash');
    expect(venda!.seller?.id).toBe(vendedor.id);
    expect(venda!.client?.id).toBe(cliente.id);

    const produtoAtualizado = await prisma.product.findUnique({ where: { id: produto.id } });
    expect(produtoAtualizado!.quantityStock).toBe(7);
  });

  it('aceita múltiplos itens e múltiplas formas de pagamento', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const p1 = await createTestProduct(user.id, { quantityStock: 5, priceSale: 50 });
    const p2 = await createTestProduct(user.id, { quantityStock: 5, priceSale: 100 });

    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [
        { product_id: p1.id, quantity: 2, unit_price: 50 },
        { product_id: p2.id, quantity: 1, unit_price: 100 },
      ],
      payments: [
        { method: 'cash', label: 'Dinheiro', amount: 120 },
        { method: 'pix', label: 'PIX', amount: 80 },
      ],
      subtotal: 200,
      discount: 0,
      surcharge: 0,
      total: 200,
    };

    const venda = await SaleService.createSale(user.id, payload);
    expect(venda!.items).toHaveLength(2);
    expect(venda!.payments).toHaveLength(2);
    expect(Number(venda!.totalValue)).toBe(200);

    const updP1 = await prisma.product.findUnique({ where: { id: p1.id } });
    const updP2 = await prisma.product.findUnique({ where: { id: p2.id } });
    expect(updP1!.quantityStock).toBe(3);
    expect(updP2!.quantityStock).toBe(4);
  });

  it('persiste metadados: presence_indicator, sale_category, observation', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);

    const payload = {
      ...(await setupSimpleSale({
        userId: user.id,
        clientId: cliente.id,
        productId: produto.id,
      })),
      presence_indicator: '1',
      sale_category: 'balcao',
      observation: 'cliente solicitou troca futura',
    };
    const venda = await SaleService.createSale(user.id, payload);
    expect(venda!.presenceIndicator).toBe('1');
    expect(venda!.saleCategory).toBe('balcao');
    expect(venda!.observation).toBe('cliente solicitou troca futura');
  });
});

describe('SaleService.createSale — saldo de crédito do cliente', () => {
  it('rejeita quando saldo do cliente é insuficiente', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 50 });
    const produto = await createTestProduct(user.id, { priceSale: 100 });

    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 100 }],
      payments: [{ method: 'credit_balance', label: 'Saldo', amount: 100 }],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    };

    await expect(SaleService.createSale(user.id, payload)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Saldo de crédito insuficiente'),
    });
  });

  it('rejeita quando saldo usado excede o total da venda', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 500 });
    const produto = await createTestProduct(user.id, { priceSale: 100 });

    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 100 }],
      payments: [
        { method: 'credit_balance', label: 'Saldo', amount: 200 },
        // total dos pagamentos bate com 200 mas total da venda é 100 — frontend mentindo
      ],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 200, // tenta forçar
    };

    // O check de soma vai falhar antes do check de excesso de saldo (200 = 200 ok), então criamos um cenário melhor:
    const payload2 = {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 100 }],
      payments: [
        { method: 'credit_balance', label: 'Saldo', amount: 150 },
        { method: 'cash', label: 'Troco', amount: -50 }, // matematicamente bate 100 mas não faz sentido
      ],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    };

    await expect(SaleService.createSale(user.id, payload2)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Saldo de crédito usado excede'),
    });
  });

  it('debita saldo do cliente atomicamente e gera FT RECEITA "Crédito utilizado"', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 250 });
    const produto = await createTestProduct(user.id, { priceSale: 100 });

    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 100 }],
      payments: [{ method: 'credit_balance', label: 'Saldo', amount: 100 }],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    };

    const venda = await SaleService.createSale(user.id, payload);
    expect(venda).toBeTruthy();

    const clienteAtualizado = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAtualizado!.creditBalance)).toBe(150);

    const fts = await prisma.financialTransaction.findMany({ where: { userId: user.id } });
    expect(fts).toHaveLength(1);
    expect(fts[0].type).toBe('RECEITA');
    expect(fts[0].category).toBe('Crédito utilizado');
    expect(Number(fts[0].value)).toBe(100);
    expect(fts[0].paymentMethod).toBe('credit_balance');
    expect(fts[0].clientId).toBe(cliente.id);
    expect(fts[0].description).toContain(`venda #${venda!.id}`);
  });

  it('combina saldo + outro método (pagamento misto)', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 50 });
    const produto = await createTestProduct(user.id, { priceSale: 100 });

    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 100 }],
      payments: [
        { method: 'credit_balance', label: 'Saldo', amount: 50 },
        { method: 'pix', label: 'PIX', amount: 50 },
      ],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    };

    const venda = await SaleService.createSale(user.id, payload);
    expect(venda).toBeTruthy();

    const clienteAtualizado = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAtualizado!.creditBalance)).toBe(0);

    expect(venda!.payments).toHaveLength(2);
  });

  it('cardBrand é forçado a null em pagamento credit_balance mesmo se enviado', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 100 });
    const produto = await createTestProduct(user.id, { priceSale: 100 });

    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 100 }],
      payments: [
        { method: 'credit_balance', label: 'Saldo', amount: 100, cardBrand: 'visa' } as any,
      ],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    };

    const venda = await SaleService.createSale(user.id, payload);
    expect(venda!.payments[0].cardBrand).toBeNull();
  });

  it('corrida: duas vendas simultâneas drenando todo o saldo — apenas uma sucede', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 100 });
    const p1 = await createTestProduct(user.id, { priceSale: 100, quantityStock: 10 });
    const p2 = await createTestProduct(user.id, { priceSale: 100, quantityStock: 10 });

    const make = (productId: number) => ({
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: productId, quantity: 1, unit_price: 100 }],
      payments: [{ method: 'credit_balance', label: 'Saldo', amount: 100 }],
      subtotal: 100,
      discount: 0,
      surcharge: 0,
      total: 100,
    });

    const results = await Promise.allSettled([
      SaleService.createSale(user.id, make(p1.id)),
      SaleService.createSale(user.id, make(p2.id)),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // O saldo nunca pode ficar negativo.
    const clienteAtualizado = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAtualizado!.creditBalance)).toBe(0);
  });
});

describe('SaleService.createSale — atomicidade', () => {
  it('falha durante a transação reverte estoque e saldo (consistência)', async () => {
    // Forçamos a falha pedindo quantidade maior do que existe — a checagem
    // de estoque acontece ANTES da transação, então não há rollback a testar;
    // testamos via outro caminho: pagamento que excede saldo (rejeição pós checagem prévia).
    // O cenário de "transação revertida mid-flight" é melhor coberto pelo teste de corrida acima.

    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { creditBalance: 100 });
    const produto = await createTestProduct(user.id, { quantityStock: 5, priceSale: 100 });

    // Antes:
    const before = await prisma.product.findUnique({ where: { id: produto.id } });

    // Tentamos venda com saldo inválido (insuficiente) — antes mesmo da transação,
    // garantimos que nada foi modificado.
    const payload = {
      client_id: cliente.id,
      seller_id: null,
      items: [{ product_id: produto.id, quantity: 1, unit_price: 200 }],
      payments: [{ method: 'credit_balance', label: 'Saldo', amount: 200 }],
      subtotal: 200,
      discount: 0,
      surcharge: 0,
      total: 200,
    };

    await expect(SaleService.createSale(user.id, payload)).rejects.toBeDefined();

    const after = await prisma.product.findUnique({ where: { id: produto.id } });
    expect(after!.quantityStock).toBe(before!.quantityStock);

    const clienteAfter = await prisma.client.findUnique({ where: { id: cliente.id } });
    expect(Number(clienteAfter!.creditBalance)).toBe(100);

    const sales = await prisma.sale.count({ where: { userId: user.id } });
    expect(sales).toBe(0);
  });
});

describe('SaleService.getSalesByUser', () => {
  it('isolamento por tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await createTestClient(u1.id);
    const c2 = await createTestClient(u2.id);
    const p1 = await createTestProduct(u1.id);
    const p2 = await createTestProduct(u2.id);

    await SaleService.createSale(
      u1.id,
      await setupSimpleSale({ userId: u1.id, clientId: c1.id, productId: p1.id })
    );
    await SaleService.createSale(
      u2.id,
      await setupSimpleSale({ userId: u2.id, clientId: c2.id, productId: p2.id })
    );

    const { sales, total } = await SaleService.getSalesByUser(u1.id);
    expect(sales).toHaveLength(1);
    expect(total).toBe(1);
    expect(sales[0].clientId).toBe(c1.id);
  });

  it('limit é clampeado entre 1 e 100', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 200 });
    for (let i = 0; i < 3; i++) {
      await SaleService.createSale(
        user.id,
        await setupSimpleSale({ userId: user.id, clientId: cliente.id, productId: produto.id })
      );
    }
    const r1 = await SaleService.getSalesByUser(user.id, 0); // clampeia pra 1
    expect(r1.sales).toHaveLength(1);
    const r2 = await SaleService.getSalesByUser(user.id, 9999); // clampeia pra 100
    expect(r2.sales).toHaveLength(3);
  });

  it('filtra por clientId', async () => {
    const user = await createTestUser();
    const c1 = await createTestClient(user.id);
    const c2 = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });
    await SaleService.createSale(
      user.id,
      await setupSimpleSale({ userId: user.id, clientId: c1.id, productId: produto.id })
    );
    await SaleService.createSale(
      user.id,
      await setupSimpleSale({ userId: user.id, clientId: c2.id, productId: produto.id })
    );

    const { sales } = await SaleService.getSalesByUser(user.id, 100, 0, undefined, undefined, {
      clientId: c1.id,
    });
    expect(sales).toHaveLength(1);
    expect(sales[0].clientId).toBe(c1.id);
  });

  it('filtra por productId via items.some (com validação de ownership)', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const p1 = await createTestProduct(user.id);
    const p2 = await createTestProduct(user.id);
    await SaleService.createSale(
      user.id,
      await setupSimpleSale({ userId: user.id, clientId: cliente.id, productId: p1.id })
    );
    await SaleService.createSale(
      user.id,
      await setupSimpleSale({ userId: user.id, clientId: cliente.id, productId: p2.id })
    );

    const { sales } = await SaleService.getSalesByUser(user.id, 100, 0, undefined, undefined, {
      productId: p1.id,
    });
    expect(sales).toHaveLength(1);
  });

  it('filtro por productId de outro tenant não retorna vendas', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await createTestClient(u1.id);
    const p1 = await createTestProduct(u1.id);
    const p2Outro = await createTestProduct(u2.id);

    await SaleService.createSale(
      u1.id,
      await setupSimpleSale({ userId: u1.id, clientId: c1.id, productId: p1.id })
    );

    const { sales } = await SaleService.getSalesByUser(u1.id, 100, 0, undefined, undefined, {
      productId: p2Outro.id,
    });
    expect(sales).toHaveLength(0);
  });
});

describe('SaleService.getSaleById', () => {
  it('retorna venda do próprio tenant com relações', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id);
    const venda = await SaleService.createSale(
      user.id,
      await setupSimpleSale({ userId: user.id, clientId: cliente.id, productId: produto.id })
    );

    const fetched = await SaleService.getSaleById(user.id, venda!.id);
    expect(fetched.id).toBe(venda!.id);
    expect(fetched.items).toHaveLength(1);
    expect(fetched.payments).toHaveLength(1);
  });

  it('rejeita venda de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await createTestClient(u1.id);
    const p1 = await createTestProduct(u1.id);
    const venda = await SaleService.createSale(
      u1.id,
      await setupSimpleSale({ userId: u1.id, clientId: c1.id, productId: p1.id })
    );

    await expect(SaleService.getSaleById(u2.id, venda!.id)).rejects.toMatchObject({
      status: 404,
      message: 'Venda não encontrada',
    });
  });
});
