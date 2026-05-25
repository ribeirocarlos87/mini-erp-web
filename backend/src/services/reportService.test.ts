import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ReportService } from './reportService';
import { SaleService } from './saleService';
import { ReturnService } from './returnService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import {
  createTestUser,
  createTestClient,
  createTestProduct,
  createTestEmployee,
  createTestCategory,
  createTestBrand,
  createTestSupplier,
} from '../test/factories';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

/**
 * Helper: cria venda padrão.
 */
async function placeSale(opts: {
  userId: number;
  clientId: number;
  productId: number;
  sellerId?: number | null;
  unitPrice?: number;
  quantity?: number;
  saleCategory?: string;
  payments?: Array<{ method: string; label: string; amount: number }>;
}) {
  const unitPrice = opts.unitPrice ?? 100;
  const quantity = opts.quantity ?? 1;
  const total = unitPrice * quantity;
  const payments = opts.payments ?? [{ method: 'cash', label: 'Dinheiro', amount: total }];
  return SaleService.createSale(opts.userId, {
    client_id: opts.clientId,
    seller_id: opts.sellerId ?? null,
    items: [{ product_id: opts.productId, quantity, unit_price: unitPrice }],
    payments,
    subtotal: total,
    discount: 0,
    surcharge: 0,
    total,
    sale_category: opts.saleCategory,
  });
}

describe('ReportService.salesReport', () => {
  it('agrupa por venda (default) com summary correto e isolamento por tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await createTestClient(u1.id);
    const c2 = await createTestClient(u2.id);
    const p1 = await createTestProduct(u1.id, { quantityStock: 100 });
    const p2 = await createTestProduct(u2.id, { quantityStock: 100 });

    await placeSale({ userId: u1.id, clientId: c1.id, productId: p1.id, unitPrice: 100 });
    await placeSale({ userId: u1.id, clientId: c1.id, productId: p1.id, unitPrice: 150 });
    await placeSale({ userId: u2.id, clientId: c2.id, productId: p2.id, unitPrice: 999 });

    const r = await ReportService.salesReport(u1.id);
    expect(r.summary.totalSales).toBe(2);
    expect(r.summary.totalNet).toBe(250);
    expect(r.summary.totalItems).toBe(2);
    expect(r.groupBy).toBe('sale');
    expect(r.rows).toHaveLength(2);
  });

  it('groupBy="product" agrupa por produto e ordena por total desc', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const pA = await createTestProduct(user.id, { name: 'Prod A', quantityStock: 100, priceSale: 50 });
    const pB = await createTestProduct(user.id, { name: 'Prod B', quantityStock: 100, priceSale: 200 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: pA.id, unitPrice: 50, quantity: 3 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: pB.id, unitPrice: 200, quantity: 1 });

    const r = await ReportService.salesReport(user.id, undefined, undefined, 'product');
    expect(r.groupBy).toBe('product');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].col1).toBe('Prod B'); // maior total vem primeiro
    expect(r.rows[0].col4).toBe(200);
    expect(r.rows[1].col4).toBe(150);
  });

  it('groupBy="payment" agrega por label de pagamento', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });
    await placeSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 100,
      payments: [
        { method: 'cash', label: 'Dinheiro', amount: 60 },
        { method: 'pix', label: 'PIX', amount: 40 },
      ],
    });
    await placeSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 50,
      payments: [{ method: 'cash', label: 'Dinheiro', amount: 50 }],
    });

    const r = await ReportService.salesReport(user.id, undefined, undefined, 'payment');
    const dinheiro = r.rows.find((row) => row.col1 === 'Dinheiro')!;
    const pix = r.rows.find((row) => row.col1 === 'PIX')!;
    expect(dinheiro.col3).toBe(110);
    expect(pix.col3).toBe(40);
  });

  it('filtra por intervalo de datas (saleDate)', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });

    const venda1 = await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id });
    const venda2 = await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id });

    // Forçar datas distintas via update direto
    await prisma.sale.update({ where: { id: venda1!.id }, data: { saleDate: new Date('2026-01-15') } });
    await prisma.sale.update({ where: { id: venda2!.id }, data: { saleDate: new Date('2026-03-15') } });

    const r = await ReportService.salesReport(user.id, '2026-02-01', '2026-02-28');
    expect(r.summary.totalSales).toBe(0);

    const r2 = await ReportService.salesReport(user.id, '2026-03-01', '2026-03-31');
    expect(r2.summary.totalSales).toBe(1);
  });
});

describe('ReportService.commissionsReport', () => {
  it('agrupa por vendedor, ignora vendas sem vendedor, aplica commissionRate', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });
    const v1 = await createTestEmployee(user.id, 'Vendedor A');
    const v2 = await createTestEmployee(user.id, 'Vendedor B');

    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, sellerId: v1.id, unitPrice: 100 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, sellerId: v1.id, unitPrice: 200 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, sellerId: v2.id, unitPrice: 50 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, sellerId: null, unitPrice: 999 });

    const r = await ReportService.commissionsReport(user.id, undefined, undefined, 10);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].sellerName).toBe('Vendedor A');
    expect(r.rows[0].totalValue).toBe(300);
    expect(r.rows[0].commission).toBe(30);
    expect(r.rows[1].sellerName).toBe('Vendedor B');
    expect(r.rows[1].commission).toBe(5);
    expect(r.summary.totalCommissions).toBe(35);
  });
});

describe('ReportService.salesChannelsReport', () => {
  it('agrega por saleCategory, default "Loja Física", calcula share', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });

    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 100, saleCategory: 'ecommerce' });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 300, saleCategory: 'ecommerce' });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 100 }); // sem saleCategory → "Loja Física"

    const r = await ReportService.salesChannelsReport(user.id);
    expect(r.rows).toHaveLength(2);
    const eco = r.rows.find((row) => row.channel === 'ecommerce')!;
    const fisica = r.rows.find((row) => row.channel === 'Loja Física')!;
    expect(eco.totalValue).toBe(400);
    expect(fisica.totalValue).toBe(100);
    expect(eco.share).toBeCloseTo(80, 1);
  });
});

describe('ReportService.dailyCashReport', () => {
  it('agrupa por data ISO (yyyy-mm-dd) com soma de pagamentos por label', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });

    await placeSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 100,
      payments: [{ method: 'pix', label: 'PIX', amount: 100 }],
    });
    await placeSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 50,
      payments: [{ method: 'cash', label: 'Dinheiro', amount: 50 }],
    });

    const r = await ReportService.dailyCashReport(user.id);
    expect(r.summary.totalDays).toBe(1);
    expect(r.summary.totalSales).toBe(2);
    expect(r.summary.totalValue).toBe(150);
    expect(r.rows[0].payments).toEqual({ PIX: 100, Dinheiro: 50 });
  });
});

describe('ReportService.paymentMethodsReport', () => {
  it('agrupa por label, calcula share por método', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });

    await placeSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 100,
      payments: [{ method: 'pix', label: 'PIX', amount: 100 }],
    });
    await placeSale({
      userId: user.id,
      clientId: cliente.id,
      productId: produto.id,
      unitPrice: 100,
      payments: [{ method: 'cash', label: 'Dinheiro', amount: 100 }],
    });

    const r = await ReportService.paymentMethodsReport(user.id);
    expect(r.summary.totalValue).toBe(200);
    expect(r.rows.find((m) => m.method === 'PIX')?.share).toBe(50);
    expect(r.rows.find((m) => m.method === 'Dinheiro')?.share).toBe(50);
  });
});

describe('ReportService.cashFlowReport (DFC)', () => {
  it('calcula netCashFlow = revenue - returns - entries', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100, priceSale: 100 });

    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 100, quantity: 2 });
    // Receita: 200, sem devoluções, sem entries
    const r = await ReportService.cashFlowReport(user.id);
    expect(r.summary.totalRevenue).toBe(200);
    expect(r.summary.totalReturns).toBe(0);
    expect(r.summary.totalEntries).toBe(0);
    expect(r.summary.netCashFlow).toBe(200);
  });
});

describe('ReportService.productPerformanceReport', () => {
  it('calcula grossProfit (revenue - cost) e suporta filtros por categoryId/brandId', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const cat = await createTestCategory(user.id);
    const brand = await createTestBrand(user.id);
    const produto = await createTestProduct(user.id, {
      quantityStock: 100,
      priceSale: 100,
      priceCost: 60,
      categoryId: cat.id,
      brandId: brand.id,
    });
    const produtoSemCat = await createTestProduct(user.id, { quantityStock: 100, priceSale: 50, priceCost: 30 });

    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 100, quantity: 3 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produtoSemCat.id, unitPrice: 50, quantity: 1 });

    const rAll = await ReportService.productPerformanceReport(user.id);
    expect(rAll.rows).toHaveLength(2);
    const prodComCat = rAll.rows.find((r) => r.productId === produto.id)!;
    expect(prodComCat.revenue).toBe(300);
    expect(prodComCat.cost).toBe(180);
    expect(prodComCat.grossProfit).toBe(120);

    const rFiltered = await ReportService.productPerformanceReport(user.id, undefined, undefined, cat.id);
    expect(rFiltered.rows).toHaveLength(1);
    expect(rFiltered.rows[0].productId).toBe(produto.id);
  });
});

describe('ReportService.salesByCategoryReport', () => {
  it('agrupa por categoria, com fallback "Sem categoria" para produtos sem categoria', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const cat = await createTestCategory(user.id, 'Bebidas');
    const pComCat = await createTestProduct(user.id, { categoryId: cat.id, quantityStock: 100 });
    const pSemCat = await createTestProduct(user.id, { quantityStock: 100 });

    await placeSale({ userId: user.id, clientId: cliente.id, productId: pComCat.id, unitPrice: 50 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: pSemCat.id, unitPrice: 30 });

    const r = await ReportService.salesByCategoryReport(user.id);
    expect(r.rows).toHaveLength(2);
    expect(r.rows.find((row) => row.category === 'Bebidas')?.revenue).toBe(50);
    expect(r.rows.find((row) => row.category === 'Sem categoria')?.revenue).toBe(30);
  });
});

describe('ReportService.stockInventoryReport', () => {
  it('conta low/out of stock corretamente', async () => {
    const user = await createTestUser();
    await createTestProduct(user.id, { quantityStock: 0, name: 'fora' });
    await createTestProduct(user.id, { quantityStock: 3, name: 'baixo' });
    await prisma.product.update({
      where: { id: (await createTestProduct(user.id, { quantityStock: 3, name: 'baixo-com-min' })).id },
      data: { minStock: 5 },
    });
    await createTestProduct(user.id, { quantityStock: 100, name: 'ok' });

    const r = await ReportService.stockInventoryReport(user.id);
    expect(r.summary.totalProducts).toBe(4);
    expect(r.summary.outOfStock).toBe(1);
    expect(r.summary.lowStock).toBe(1);
  });
});

describe('ReportService.clientReport', () => {
  it('agrupa vendas por cliente; sem cliente cai em "Consumidor final"', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { name: 'Cliente A' });
    const produto = await createTestProduct(user.id, { quantityStock: 100 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 100 });
    await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 200 });

    // Venda sem cliente (criada direto no Prisma; SaleService exige client_id)
    await prisma.sale.create({
      data: {
        userId: user.id,
        totalValue: 50,
        subtotal: 50,
        saleDate: new Date(),
        items: { create: [{ productId: produto.id, quantity: 1, unitPrice: 50, subtotal: 50 }] },
      },
    });

    const r = await ReportService.clientReport(user.id);
    expect(r.rows.length).toBeGreaterThanOrEqual(2);
    expect(r.rows.find((row) => row.clientName === 'Cliente A')?.totalValue).toBe(300);
    expect(r.rows.find((row) => row.clientName === 'Consumidor final')?.totalValue).toBe(50);
  });
});

describe('ReportService.clientLifecycleReport (RFV)', () => {
  it('cliente sem compras é segmentado como "Novo"', async () => {
    const user = await createTestUser();
    await createTestClient(user.id, { name: 'Novo Cliente' });
    const r = await ReportService.clientLifecycleReport(user.id);
    expect(r.rows[0].segment).toBe('Novo');
    expect(r.rows[0].frequency).toBe(0);
  });

  it('cliente com alta frequência e valor recente é "Campeão"', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id);
    const produto = await createTestProduct(user.id, { quantityStock: 100 });

    // 10 vendas recentes de R$ 600 cada — score máximo nos 3 eixos
    for (let i = 0; i < 10; i++) {
      await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 600 });
    }
    const r = await ReportService.clientLifecycleReport(user.id);
    expect(r.rows[0].segment).toBe('Campeão');
    expect(r.rows[0].frequency).toBe(10);
  });
});

describe('ReportService.clientCreditsReport', () => {
  it('agrupa apenas devoluções GERAR_CREDITO por cliente', async () => {
    const user = await createTestUser();
    const cliente = await createTestClient(user.id, { name: 'C1' });
    const supplier = await createTestSupplier(user.id);
    const produto = await createTestProduct(user.id, { supplierId: supplier.id, quantityStock: 100, priceSale: 100 });

    const venda = await placeSale({ userId: user.id, clientId: cliente.id, productId: produto.id, unitPrice: 100, quantity: 2 });

    // Devolução TROCA — NÃO entra no relatório
    await ReturnService.createReturn(user.id, {
      saleId: venda!.id,
      items: [{ saleItemId: venda!.items[0].id, quantity: 1 }],
      resolutionMethod: 'TROCA',
    });

    // Devolução GERAR_CREDITO — entra no relatório
    await ReturnService.createReturn(user.id, {
      saleId: venda!.id,
      items: [{ saleItemId: venda!.items[0].id, quantity: 1 }],
      resolutionMethod: 'GERAR_CREDITO',
    });

    const r = await ReportService.clientCreditsReport(user.id);
    expect(r.summary.totalReturns).toBe(1);
    expect(r.summary.totalCreditValue).toBe(100);
    expect(r.rows[0].clientName).toBe('C1');
    expect(r.rows[0].totalCredit).toBe(100);
  });

  it('isolamento por tenant em clientCreditsReport', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const c1 = await createTestClient(u1.id);
    const c2 = await createTestClient(u2.id);
    const p1 = await createTestProduct(u1.id, { quantityStock: 100 });
    const p2 = await createTestProduct(u2.id, { quantityStock: 100 });

    const venda1 = await placeSale({ userId: u1.id, clientId: c1.id, productId: p1.id });
    const venda2 = await placeSale({ userId: u2.id, clientId: c2.id, productId: p2.id });

    await ReturnService.createReturn(u1.id, {
      saleId: venda1!.id,
      items: [{ saleItemId: venda1!.items[0].id, quantity: 1 }],
      resolutionMethod: 'GERAR_CREDITO',
    });
    await ReturnService.createReturn(u2.id, {
      saleId: venda2!.id,
      items: [{ saleItemId: venda2!.items[0].id, quantity: 1 }],
      resolutionMethod: 'GERAR_CREDITO',
    });

    const r1 = await ReportService.clientCreditsReport(u1.id);
    expect(r1.summary.totalReturns).toBe(1);
    expect(r1.rows[0].clientName).toBe(c1.name);
  });
});
