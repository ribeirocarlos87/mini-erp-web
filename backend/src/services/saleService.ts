import prisma from '../db/prismaClient';

interface CreateSaleItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

interface CreateSalePayment {
  method: string;
  label: string;
  amount: number;
  installments?: number;
  cardBrand?: string;
}

interface CreateSaleData {
  client_id: number;
  seller_id?: number | null;
  items: CreateSaleItem[];
  payments: CreateSalePayment[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  presence_indicator?: string;
  sale_category?: string;
  observation?: string;
}

// Métodos cujo efeito é puramente financeiro-comercial (dinheiro/pix/cartão).
// `credit_balance` tem tratamento especial: consome saldo do cliente e precisa ser
// debitado atomicamente dentro da transação da venda.
const CREDIT_BALANCE_METHOD = 'credit_balance';

// Tolerância p/ comparação entre decimais vindos do front (Number) e total da venda.
const CENTS_EPSILON = 0.01;

export class SaleService {
  static async createSale(userId: number, data: CreateSaleData) {
    // ── 1. Cliente pertence ao tenant ──
    const client = await prisma.client.findFirst({
      where: { id: data.client_id, userId },
      select: { id: true, creditBalance: true, name: true },
    });
    if (!client) {
      throw { status: 400, message: 'Cliente não encontrado' };
    }

    // ── 2. Produtos pertencem ao tenant ──
    const productIds = data.items.map((i) => i.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, userId },
      select: { id: true, quantityStock: true },
    });

    if (products.length !== productIds.length) {
      const found = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !found.has(id));
      throw { status: 400, message: `Produtos não encontrados: ${missing.join(', ')}` };
    }

    // ── 2.5. Vendedor (se enviado) pertence ao tenant ──
    //    Sem essa checagem, atacante atribui a venda a vendedor de outro tenant —
    //    aparece em `include: seller` e distorce comissões/relatórios.
    let validatedSellerId: number | null = null;
    if (data.seller_id != null) {
      const seller = await prisma.employee.findFirst({
        where: { id: data.seller_id, userId },
        select: { id: true },
      });
      if (!seller) {
        throw { status: 400, message: 'Vendedor não encontrado' };
      }
      validatedSellerId = seller.id;
    }

    // ── 3. Estoque disponível ──
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.product_id)!;
      if (product.quantityStock < item.quantity) {
        throw {
          status: 400,
          message: `Estoque insuficiente para produto ID ${item.product_id}. Disponível: ${product.quantityStock}, Solicitado: ${item.quantity}`,
        };
      }
    }

    // ── 4. Consistência dos pagamentos ──
    //    O frontend pode errar, mas o backend não confia: todas as contas são refeitas aqui.
    const totalPaid = data.payments.reduce((s, p) => s + Number(p.amount), 0);
    const saleTotal = Number(data.total);
    if (!(saleTotal > 0)) {
      throw { status: 400, message: 'Total da venda inválido' };
    }
    if (Math.abs(totalPaid - saleTotal) > CENTS_EPSILON) {
      throw {
        status: 400,
        message: `Soma dos pagamentos (${totalPaid.toFixed(2)}) não bate com o total da venda (${saleTotal.toFixed(2)})`,
      };
    }

    // Total solicitado em saldo de crédito (pode haver mais de uma entrada por erro do front — somamos)
    const creditBalanceAmount = data.payments
      .filter((p) => p.method === CREDIT_BALANCE_METHOD)
      .reduce((s, p) => s + Number(p.amount), 0);

    if (creditBalanceAmount > 0) {
      // Checagem prévia (pré-voo): dá mensagem clara sem precisar esperar a corrida.
      // A verificação definitiva é feita ATOMICAMENTE dentro da transação (updateMany com gte).
      const currentBalance = Number(client.creditBalance);
      if (creditBalanceAmount > currentBalance + CENTS_EPSILON) {
        throw {
          status: 400,
          message: `Saldo de crédito insuficiente. Disponível: R$ ${currentBalance.toFixed(2)}, solicitado: R$ ${creditBalanceAmount.toFixed(2)}`,
        };
      }
      if (creditBalanceAmount > saleTotal + CENTS_EPSILON) {
        throw {
          status: 400,
          message: 'Saldo de crédito usado excede o valor da venda',
        };
      }
    }

    // ── 5. Transação atômica: cria venda + itens + pagamentos + debita estoque + debita saldo + gera FT de baixa ──
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          userId,
          clientId: client.id,
          sellerId: validatedSellerId,
          totalValue: saleTotal,
          subtotal: data.subtotal,
          discount: data.discount,
          surcharge: data.surcharge,
          presenceIndicator: data.presence_indicator || null,
          saleCategory: data.sale_category || null,
          observation: data.observation || null,
          saleDate: new Date(),
        },
      });

      await tx.saleItem.createMany({
        data: data.items.map((item) => ({
          saleId: newSale.id,
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: Number(item.unit_price) * item.quantity,
        })),
      });

      await tx.salePayment.createMany({
        data: data.payments.map((p) => ({
          saleId: newSale.id,
          method: p.method,
          label: p.label,
          amount: p.amount,
          installments: p.installments || null,
          // Saldo de crédito não tem bandeira — ignora qualquer valor vindo do front.
          cardBrand: p.method === CREDIT_BALANCE_METHOD ? null : (p.cardBrand || null),
        })),
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { quantityStock: { decrement: item.quantity } },
        });
      }

      // ── Débito ATÔMICO do saldo do cliente ──
      //   - `gte: creditBalanceAmount` no WHERE previne saldo negativo em corrida (dois caixas, mesmo cliente).
      //   - `id: client.id, userId` isola por tenant.
      //   - Se count !== 1, lança erro → toda a transação reverte (inclusive a venda já criada).
      if (creditBalanceAmount > 0) {
        const updated = await tx.client.updateMany({
          where: {
            id: client.id,
            userId,
            creditBalance: { gte: creditBalanceAmount },
          },
          data: { creditBalance: { decrement: creditBalanceAmount } },
        });
        if (updated.count !== 1) {
          throw {
            status: 409,
            message: 'Saldo de crédito do cliente foi alterado por outra operação. Revise e tente novamente.',
          };
        }

        // Registra a baixa no financeiro como RECEITA (liquida o passivo "saldo a devolver").
        await tx.financialTransaction.create({
          data: {
            userId,
            clientId: client.id,
            type: 'RECEITA',
            category: 'Crédito utilizado',
            description: `Uso de saldo de crédito na venda #${newSale.id} — ${client.name}`.slice(0, 255),
            value: creditBalanceAmount,
            date: new Date(),
            paymentMethod: CREDIT_BALANCE_METHOD,
            status: 'PAGO',
            notes: null,
          },
        });
      }

      return newSale;
    });

    // Retorno completo com relações
    return prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        client: { select: { id: true, name: true, cpfCnpj: true, phone: true, email: true, creditBalance: true } },
        seller: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, code: true } },
          },
        },
        payments: true,
      },
    });
  }

  static async getSalesByUser(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    dateFrom?: string,
    dateTo?: string,
    filters?: {
      saleId?: number;
      clientId?: number;
      productId?: number;
      barcode?: string;
    }
  ) {
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const where: any = { userId };

    if (dateFrom || dateTo) {
      where.saleDate = {};
      if (dateFrom) where.saleDate.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        where.saleDate.lt = end;
      }
    }

    if (filters?.saleId) where.id = filters.saleId;
    if (filters?.clientId) where.clientId = filters.clientId;

    // Filtro por produto ou barcode: aplicado via items.some — produto validado como pertencente ao mesmo user
    if (filters?.productId || filters?.barcode) {
      const productWhere: any = { userId };
      if (filters.productId) productWhere.id = filters.productId;
      if (filters.barcode) productWhere.barcode = filters.barcode;
      const products = await prisma.product.findMany({ where: productWhere, select: { id: true } });
      const productIds = products.map((p) => p.id);
      if (productIds.length === 0) {
        return { sales: [], total: 0 };
      }
      where.items = { some: { productId: { in: productIds } } };
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, code: true } },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: offset,
      }),
      prisma.sale.count({ where }),
    ]);

    return { sales, total };
  }

  static async getSaleById(userId: number, saleId: number) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        client: { select: { id: true, name: true, cpfCnpj: true, phone: true, email: true } },
        seller: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, code: true } },
          },
        },
        payments: true,
      },
    });

    if (!sale || sale.userId !== userId) {
      throw { status: 404, message: 'Venda não encontrada' };
    }

    return sale;
  }
}
