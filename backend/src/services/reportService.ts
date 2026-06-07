import prisma from '../db/prismaClient';

type ReportRow = { id: number | string; col1: string | number | Date; col2?: string | number; col3?: string | number; col4?: string | number; col5?: string | number; col6?: string | number; col7?: string | number; col8?: string | number };

function parseDateRange(dateFrom?: string, dateTo?: string) {
  const range: any = {};
  if (dateFrom) range.gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setDate(end.getDate() + 1);
    range.lt = end;
  }
  return Object.keys(range).length ? range : undefined;
}

export class ReportService {
  /* ─── 1. Vendas (com agrupamento) ─── */
  static async salesReport(userId: number, dateFrom?: string, dateTo?: string, groupBy: string = 'sale'): Promise<{ summary: Record<string, number>; groupBy: string; columns: string[]; rows: ReportRow[] }> {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = { userId };
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: {
          select: { quantity: true, subtotal: true, product: { select: { id: true, name: true, supplierId: true, supplier: { select: { name: true } }, categoryId: true, productCategory: { select: { name: true } } } } },
        },
        payments: { select: { method: true, label: true, amount: true } },
      },
      orderBy: { saleDate: 'desc' },
    });

    const returnWhere: any = { userId };
    if (dateRange) returnWhere.returnDate = dateRange;
    const returnsCount = await prisma.return.count({ where: returnWhere });

    const totalGross = sales.reduce((s, sale) => s + Number(sale.subtotal), 0);
    const totalDiscount = sales.reduce((s, sale) => s + Number(sale.discount), 0);
    const totalSurcharge = sales.reduce((s, sale) => s + Number(sale.surcharge), 0);
    const totalNet = sales.reduce((s, sale) => s + Number(sale.totalValue), 0);
    const totalItems = sales.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.quantity, 0), 0);

    const summary = { totalSales: sales.length, totalGross, totalDiscount, totalSurcharge, totalNet, totalItems, totalReturns: returnsCount };

    /* ── Agrupamento por Venda (padrão) ── */
    if (groupBy === 'sale') {
      return {
        summary,
        groupBy: 'sale',
        columns: ['Data', 'Cliente', 'Vendedor', 'Itens', 'Subtotal', 'Desconto', 'Total', 'Pagamento'],
        rows: sales.map((s) => ({
          id: s.id,
          col1: s.saleDate,
          col2: s.client?.name || 'Consumidor final',
          col3: s.seller?.name || '—',
          col4: s.items.reduce((a, i) => a + i.quantity, 0),
          col5: Number(s.subtotal),
          col6: Number(s.discount),
          col7: Number(s.totalValue),
          col8: [...new Set(s.payments.map((p) => p.label))].join(', '),
        })),
      };
    }

    /* ── Agrupamento por Produto ── */
    if (groupBy === 'product') {
      const map = new Map<number, { name: string; qty: number; subtotal: number; sales: number }>();
      for (const sale of sales) {
        for (const item of sale.items) {
          const pid = item.product.id;
          const e = map.get(pid) || { name: item.product.name, qty: 0, subtotal: 0, sales: 0 };
          e.qty += item.quantity;
          e.subtotal += Number(item.subtotal);
          e.sales++;
          map.set(pid, e);
        }
      }
      return {
        summary, groupBy: 'product',
        columns: ['Produto', 'Vendas', 'Quantidade', 'Total'],
        rows: Array.from(map.entries()).map(([id, d]) => ({ id, col1: d.name, col2: d.sales, col3: d.qty, col4: d.subtotal })).sort((a, b) => (b.col4 as number) - (a.col4 as number)),
      };
    }

    /* ── Agrupamento por Categoria de Produtos ── */
    if (groupBy === 'category') {
      const map = new Map<string, { qty: number; subtotal: number; sales: number }>();
      for (const sale of sales) {
        for (const item of sale.items) {
          const cat = item.product.productCategory?.name || 'Sem categoria';
          const e = map.get(cat) || { qty: 0, subtotal: 0, sales: 0 };
          e.qty += item.quantity;
          e.subtotal += Number(item.subtotal);
          e.sales++;
          map.set(cat, e);
        }
      }
      return {
        summary, groupBy: 'category',
        columns: ['Categoria', 'Vendas', 'Quantidade', 'Total'],
        rows: Array.from(map.entries()).map(([cat, d], i) => ({ id: i, col1: cat, col2: d.sales, col3: d.qty, col4: d.subtotal })).sort((a, b) => (b.col4 as number) - (a.col4 as number)),
      };
    }

    /* ── Agrupamento por Cliente ── */
    if (groupBy === 'client') {
      const map = new Map<string, { qty: number; total: number; sales: number }>();
      for (const sale of sales) {
        const cn = sale.client?.name || 'Consumidor final';
        const e = map.get(cn) || { qty: 0, total: 0, sales: 0 };
        e.qty += sale.items.reduce((a, i) => a + i.quantity, 0);
        e.total += Number(sale.totalValue);
        e.sales++;
        map.set(cn, e);
      }
      return {
        summary, groupBy: 'client',
        columns: ['Cliente', 'Vendas', 'Itens', 'Total'],
        rows: Array.from(map.entries()).map(([cn, d], i) => ({ id: i, col1: cn, col2: d.sales, col3: d.qty, col4: d.total })).sort((a, b) => (b.col4 as number) - (a.col4 as number)),
      };
    }

    /* ── Agrupamento por Vendedor ── */
    if (groupBy === 'seller') {
      const map = new Map<string, { qty: number; total: number; sales: number }>();
      for (const sale of sales) {
        const sn = sale.seller?.name || 'Sem vendedor';
        const e = map.get(sn) || { qty: 0, total: 0, sales: 0 };
        e.qty += sale.items.reduce((a, i) => a + i.quantity, 0);
        e.total += Number(sale.totalValue);
        e.sales++;
        map.set(sn, e);
      }
      return {
        summary, groupBy: 'seller',
        columns: ['Vendedor', 'Vendas', 'Itens', 'Total'],
        rows: Array.from(map.entries()).map(([sn, d], i) => ({ id: i, col1: sn, col2: d.sales, col3: d.qty, col4: d.total })).sort((a, b) => (b.col4 as number) - (a.col4 as number)),
      };
    }

    /* ── Agrupamento por Forma de Pagamento ── */
    if (groupBy === 'payment') {
      const map = new Map<string, { count: number; total: number }>();
      for (const sale of sales) {
        for (const p of sale.payments) {
          const e = map.get(p.label) || { count: 0, total: 0 };
          e.count++;
          e.total += Number(p.amount);
          map.set(p.label, e);
        }
      }
      return {
        summary, groupBy: 'payment',
        columns: ['Forma de Pagamento', 'Transações', 'Total'],
        rows: Array.from(map.entries()).map(([label, d], i) => ({ id: i, col1: label, col2: d.count, col3: d.total })).sort((a, b) => (b.col3 as number) - (a.col3 as number)),
      };
    }

    /* ── Agrupamento por Fornecedor ── */
    if (groupBy === 'supplier') {
      const map = new Map<string, { qty: number; subtotal: number; sales: number }>();
      for (const sale of sales) {
        for (const item of sale.items) {
          const sup = item.product.supplier?.name || 'Sem fornecedor';
          const e = map.get(sup) || { qty: 0, subtotal: 0, sales: 0 };
          e.qty += item.quantity;
          e.subtotal += Number(item.subtotal);
          e.sales++;
          map.set(sup, e);
        }
      }
      return {
        summary, groupBy: 'supplier',
        columns: ['Fornecedor', 'Vendas', 'Quantidade', 'Total'],
        rows: Array.from(map.entries()).map(([sup, d], i) => ({ id: i, col1: sup, col2: d.sales, col3: d.qty, col4: d.subtotal })).sort((a, b) => (b.col4 as number) - (a.col4 as number)),
      };
    }

    /* fallback */
    return { summary, groupBy: 'sale', columns: [], rows: [] };
  }

  /* ─── 2. Comissões ─── */
  static async commissionsReport(userId: number, dateFrom?: string, dateTo?: string, commissionRate: number = 0) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = { userId };
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
        items: { select: { quantity: true, subtotal: true } },
      },
    });

    const map = new Map<number, { name: string; count: number; value: number; items: number }>();
    for (const sale of sales) {
      if (!sale.seller) continue;
      const e = map.get(sale.seller.id) || { name: sale.seller.name, count: 0, value: 0, items: 0 };
      e.count++;
      e.value += Number(sale.totalValue);
      e.items += sale.items.reduce((a, i) => a + i.quantity, 0);
      map.set(sale.seller.id, e);
    }

    const rows = Array.from(map.entries())
      .map(([id, d]) => ({
        sellerId: id,
        sellerName: d.name,
        salesCount: d.count,
        itemsSold: d.items,
        totalValue: d.value,
        commission: commissionRate > 0 ? d.value * (commissionRate / 100) : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return {
      summary: {
        totalSellers: rows.length,
        totalValue: rows.reduce((s, r) => s + r.totalValue, 0),
        totalCommissions: rows.reduce((s, r) => s + r.commission, 0),
      },
      rows,
    };
  }

  /* ─── 3. Canais de Vendas ─── */
  static async salesChannelsReport(userId: number, dateFrom?: string, dateTo?: string) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = { userId };
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({ where, select: { saleCategory: true, totalValue: true } });

    const map = new Map<string, { count: number; total: number }>();
    for (const sale of sales) {
      const ch = sale.saleCategory || 'Loja Física';
      const e = map.get(ch) || { count: 0, total: 0 };
      e.count++;
      e.total += Number(sale.totalValue);
      map.set(ch, e);
    }

    const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
    const rows = Array.from(map.entries())
      .map(([channel, d]) => ({
        channel,
        salesCount: d.count,
        totalValue: d.total,
        share: grandTotal > 0 ? (d.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return { summary: { totalChannels: rows.length, totalValue: grandTotal }, rows };
  }

  /* ─── 4. Resumo Diário de Caixa ─── */
  static async dailyCashReport(userId: number, dateFrom?: string, dateTo?: string) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = { userId };
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({ where, include: { payments: true }, orderBy: { saleDate: 'asc' } });

    const map = new Map<string, { count: number; total: number; payments: Map<string, number> }>();
    for (const sale of sales) {
      const dk = new Date(sale.saleDate).toISOString().split('T')[0];
      const e = map.get(dk) || { count: 0, total: 0, payments: new Map() };
      e.count++;
      e.total += Number(sale.totalValue);
      for (const p of sale.payments) {
        e.payments.set(p.label, (e.payments.get(p.label) || 0) + Number(p.amount));
      }
      map.set(dk, e);
    }

    const rows = Array.from(map.entries()).map(([date, d]) => ({
      date,
      salesCount: d.count,
      total: d.total,
      payments: Object.fromEntries(d.payments),
    }));

    return {
      summary: { totalDays: rows.length, totalSales: rows.reduce((s, r) => s + r.salesCount, 0), totalValue: rows.reduce((s, r) => s + r.total, 0) },
      rows,
    };
  }

  /* ─── 5. Formas de Pagamento ─── */
  static async paymentMethodsReport(userId: number, dateFrom?: string, dateTo?: string) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = { userId };
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({ where, include: { payments: true } });

    const map = new Map<string, { count: number; total: number }>();
    for (const sale of sales) {
      for (const p of sale.payments) {
        const e = map.get(p.label) || { count: 0, total: 0 };
        e.count++;
        e.total += Number(p.amount);
        map.set(p.label, e);
      }
    }

    const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
    const rows = Array.from(map.entries())
      .map(([method, d]) => ({
        method,
        transactionCount: d.count,
        totalValue: d.total,
        share: grandTotal > 0 ? (d.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return {
      summary: { totalMethods: rows.length, totalTransactions: rows.reduce((s, r) => s + r.transactionCount, 0), totalValue: grandTotal },
      rows,
    };
  }

  /* ─── 6. DFC ─── */
  static async cashFlowReport(userId: number, dateFrom?: string, dateTo?: string) {
    const dateRange = parseDateRange(dateFrom, dateTo);

    const salesWhere: any = { userId };
    if (dateRange) salesWhere.saleDate = dateRange;
    const sales = await prisma.sale.findMany({ where: salesWhere, select: { totalValue: true, discount: true, surcharge: true } });

    const returnWhere: any = { userId };
    if (dateRange) returnWhere.returnDate = dateRange;
    const returns = await prisma.return.findMany({
      where: returnWhere,
      include: { product: { select: { priceSale: true } } },
    });

    const entryWhere: any = { userId };
    if (dateRange) entryWhere.entryDate = dateRange;
    const entries = await prisma.entry.findMany({ where: entryWhere, select: { type: true, value: true, description: true, entryDate: true }, orderBy: { entryDate: 'desc' } });

    const totalRevenue = sales.reduce((s, sale) => s + Number(sale.totalValue), 0);
    const totalDiscount = sales.reduce((s, sale) => s + Number(sale.discount), 0);
    const totalReturns = returns.reduce((s, r) => s + Number(r.product?.priceSale || 0) * r.quantity, 0);
    const totalEntries = entries.reduce((s, e) => s + Number(e.value), 0);

    return {
      summary: { totalRevenue, totalDiscount, totalReturns, totalEntries, netCashFlow: totalRevenue - totalReturns - totalEntries },
      entries: entries.map((e) => ({ type: e.type, description: e.description, value: Number(e.value), date: e.entryDate })),
    };
  }

  /* ─── 7. Desempenho por Produto ─── */
  static async productPerformanceReport(
    userId: number,
    dateFrom?: string,
    dateTo?: string,
    categoryId?: number,
    brandId?: number,
    collectionId?: number,
    supplierId?: number,
    sellerId?: number
  ) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const salesWhere: any = { userId };
    if (dateRange) salesWhere.saleDate = dateRange;
    if (sellerId) salesWhere.sellerId = sellerId;

    const sales = await prisma.sale.findMany({
      where: salesWhere,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, code: true, priceCost: true, categoryId: true, brandId: true, collectionId: true, supplierId: true } },
          },
        },
      },
    });

    const returnWhere: any = { userId };
    if (dateRange) returnWhere.returnDate = dateRange;
    const returnsList = await prisma.return.findMany({ where: returnWhere });
    const retMap = new Map<number, number>();
    for (const r of returnsList) retMap.set(r.productId, (retMap.get(r.productId) || 0) + r.quantity);

    const map = new Map<number, { name: string; code: string; qty: number; revenue: number; cost: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const p = item.product;
        if (categoryId && p.categoryId !== categoryId) continue;
        if (brandId && p.brandId !== brandId) continue;
        if (collectionId && p.collectionId !== collectionId) continue;
        if (supplierId && p.supplierId !== supplierId) continue;
        const e = map.get(p.id) || { name: p.name, code: p.code, qty: 0, revenue: 0, cost: 0 };
        e.qty += item.quantity;
        e.revenue += Number(item.subtotal);
        e.cost += Number(p.priceCost || 0) * item.quantity;
        map.set(p.id, e);
      }
    }

    const rows = Array.from(map.entries())
      .map(([pid, d]) => ({
        productId: pid,
        name: d.name,
        code: d.code,
        quantitySold: d.qty,
        returns: retMap.get(pid) || 0,
        revenue: d.revenue,
        cost: d.cost,
        grossProfit: d.revenue - d.cost,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      summary: {
        totalProducts: rows.length,
        totalQuantity: rows.reduce((s, r) => s + r.quantitySold, 0),
        totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
        totalCost: rows.reduce((s, r) => s + r.cost, 0),
        totalProfit: rows.reduce((s, r) => s + r.grossProfit, 0),
      },
      rows,
    };
  }

  /* ─── 8. Vendas por Categorias ─── */
  static async salesByCategoryReport(userId: number, dateFrom?: string, dateTo?: string) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = { userId };
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { productCategory: { select: { name: true } } } } },
        },
      },
    });

    const map = new Map<string, { count: number; qty: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const cat = item.product.productCategory?.name || 'Sem categoria';
        const e = map.get(cat) || { count: 0, qty: 0, revenue: 0 };
        e.count++;
        e.qty += item.quantity;
        e.revenue += Number(item.subtotal);
        map.set(cat, e);
      }
    }

    const rows = Array.from(map.entries())
      .map(([category, d]) => ({
        category,
        salesCount: d.count,
        quantity: d.qty,
        revenue: d.revenue,
        avgTicket: d.count > 0 ? d.revenue / d.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      summary: { totalCategories: rows.length, totalQuantity: rows.reduce((s, r) => s + r.quantity, 0), totalRevenue: rows.reduce((s, r) => s + r.revenue, 0) },
      rows,
    };
  }

  /* ─── 9. Inventário de Estoque ─── */
  static async stockInventoryReport(userId: number) {
    const products = await prisma.product.findMany({
      where: { userId },
      select: {
        id: true, name: true, code: true, quantityStock: true, minStock: true, maxStock: true,
        priceCost: true, priceSale: true, unitType: true,
        productCategory: { select: { name: true } },
        productBrand: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const rows = products.map((p) => ({
      id: p.id, name: p.name, code: p.code,
      stock: p.quantityStock, minStock: p.minStock || 0, maxStock: p.maxStock || 0,
      unitType: p.unitType || 'UN',
      priceCost: Number(p.priceCost || 0), priceSale: Number(p.priceSale || 0),
      stockValue: Number(p.priceCost || 0) * p.quantityStock,
      category: p.productCategory?.name || '—',
      brand: p.productBrand?.name || '—',
      supplier: p.supplier?.name || '—',
    }));

    return {
      summary: {
        totalProducts: rows.length,
        totalStock: rows.reduce((s, r) => s + r.stock, 0),
        totalStockValue: rows.reduce((s, r) => s + r.stockValue, 0),
        lowStock: rows.filter((r) => r.stock > 0 && r.minStock > 0 && r.stock <= r.minStock).length,
        outOfStock: rows.filter((r) => r.stock <= 0).length,
      },
      rows,
    };
  }

  /* ─── 10. Clientes ─── */
  static async clientReport(userId: number, dateFrom?: string, dateTo?: string) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = { userId };
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({
      where,
      include: { client: { select: { id: true, name: true } }, items: { select: { quantity: true } } },
    });

    const map = new Map<number, { name: string; count: number; value: number; items: number }>();
    for (const sale of sales) {
      const cid = sale.clientId || 0;
      const cn = sale.client?.name || 'Consumidor final';
      const e = map.get(cid) || { name: cn, count: 0, value: 0, items: 0 };
      e.count++;
      e.value += Number(sale.totalValue);
      e.items += sale.items.reduce((a, i) => a + i.quantity, 0);
      map.set(cid, e);
    }

    const rows = Array.from(map.entries())
      .map(([cid, d]) => ({
        clientId: cid, clientName: d.name, salesCount: d.count,
        totalValue: d.value, totalItems: d.items,
        avgTicket: d.count > 0 ? d.value / d.count : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return {
      summary: { totalClients: rows.length, totalSales: rows.reduce((s, r) => s + r.salesCount, 0), totalRevenue: rows.reduce((s, r) => s + r.totalValue, 0) },
      rows,
    };
  }

  /* ─── 11. Ciclo de Vida (RFV) ─── */
  static async clientLifecycleReport(userId: number) {
    const clients = await prisma.client.findMany({
      where: { userId },
      include: { salesAsClient: { select: { saleDate: true, totalValue: true }, orderBy: { saleDate: 'desc' } } },
    });

    const now = new Date();
    const rows = clients.map((c) => {
      const freq = c.salesAsClient.length;
      const val = c.salesAsClient.reduce((s, sale) => s + Number(sale.totalValue), 0);
      const last = freq > 0 ? new Date(c.salesAsClient[0].saleDate) : null;
      const days = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : 999;

      const r = days <= 30 ? 5 : days <= 60 ? 4 : days <= 90 ? 3 : days <= 180 ? 2 : 1;
      const f = freq >= 10 ? 5 : freq >= 7 ? 4 : freq >= 4 ? 3 : freq >= 2 ? 2 : 1;
      const v = val >= 5000 ? 5 : val >= 2000 ? 4 : val >= 500 ? 3 : val >= 100 ? 2 : 1;
      const score = r + f + v;
      let seg = 'Hibernando';
      if (freq === 0) seg = 'Novo';
      else if (score >= 13) seg = 'Campeão';
      else if (score >= 10) seg = 'Leal';
      else if (score >= 7) seg = 'Potencial';
      else if (score >= 5) seg = 'Em risco';

      return {
        clientId: c.id, clientName: c.name, frequency: freq, totalValue: val,
        lastPurchase: last?.toISOString().split('T')[0] || null, recencyDays: days,
        recencyScore: r, frequencyScore: f, valueScore: v, rfvScore: score, segment: seg,
      };
    }).sort((a, b) => b.rfvScore - a.rfvScore);

    const segs = new Map<string, number>();
    for (const r of rows) segs.set(r.segment, (segs.get(r.segment) || 0) + 1);

    return { summary: { totalClients: rows.length, segments: Object.fromEntries(segs) }, rows };
  }

  /* ─── 12. Crédito de Clientes ───
   * Agrega apenas devoluções com resolutionMethod='GERAR_CREDITO' (o único método
   * que gera saldo no cadastro). Usa `refundValue` histórico; se NULL (registro
   * anterior à migração e ainda não tratado pelo backfill), cai para unitPrice
   * do saleItem correspondente × quantidade.
   *
   * Para registros antigos (antes da coluna resolution_method existir), usa o
   * prefixo `[GERAR_CREDITO]` que foi historicamente gravado no campo reason.
   */
  static async clientCreditsReport(userId: number, dateFrom?: string, dateTo?: string) {
    const dateRange = parseDateRange(dateFrom, dateTo);
    const where: any = {
      userId,
      OR: [
        { resolutionMethod: 'GERAR_CREDITO' },
        { AND: [{ resolutionMethod: null }, { reason: { startsWith: '[GERAR_CREDITO]' } }] },
      ],
    };
    if (dateRange) where.returnDate = dateRange;

    const returns = await prisma.return.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        sale: {
          select: {
            clientId: true,
            client: { select: { id: true, name: true } },
            items: { select: { productId: true, unitPrice: true, quantity: true } },
          },
        },
      },
      orderBy: { returnDate: 'desc' },
    });

    const map = new Map<number, { name: string; count: number; credit: number }>();
    for (const r of returns) {
      // Prioriza o client gravado na devolução (quem efetivamente recebeu o crédito).
      // Fallback para client da venda para registros antigos.
      const cid = r.client?.id ?? r.sale?.client?.id ?? 0;
      const cn = r.client?.name ?? r.sale?.client?.name ?? 'Sem cliente';

      // Valor: usa refundValue persistido; senão calcula do saleItem histórico.
      let value = r.refundValue != null ? Number(r.refundValue) : 0;
      if (value === 0 && r.sale) {
        const matches = r.sale.items.filter((it) => it.productId === r.productId);
        if (matches.length > 0) {
          // média ponderada por quantidade — robusto a múltiplos saleItems do mesmo produto
          const totalQty = matches.reduce((s, it) => s + it.quantity, 0);
          const weighted = matches.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
          const avg = totalQty > 0 ? weighted / totalQty : 0;
          value = avg * r.quantity;
        }
      }

      const e = map.get(cid) || { name: cn, count: 0, credit: 0 };
      e.count += r.quantity;
      e.credit += value;
      map.set(cid, e);
    }

    const rows = Array.from(map.entries())
      .map(([cid, d]) => ({ clientId: cid, clientName: d.name, returnsCount: d.count, totalCredit: d.credit }))
      .sort((a, b) => b.totalCredit - a.totalCredit);

    return {
      summary: {
        totalReturns: returns.length,
        totalCreditValue: rows.reduce((s, r) => s + r.totalCredit, 0),
        clientsWithCredits: rows.filter((r) => r.totalCredit > 0).length,
      },
      rows,
    };
  }
}
