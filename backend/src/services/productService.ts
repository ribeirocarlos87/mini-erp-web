import prisma from '../db/prismaClient';
import { Prisma } from '@prisma/client';

function generateEAN13(): string {
  const prefix = '789';
  let digits = prefix;
  for (let i = 0; i < 9; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return digits + checkDigit.toString();
}

const SKU_SEQ_PAD = 6;
const SKU_DEFAULT_PREFIX = 'PRD';

/**
 * Garante que o recurso referenciado pela FK pertence ao tenant.
 *
 * Por que existe: o backend NUNCA confia em FKs vindas do cliente. Sem essa
 * verificação, um cliente malicioso pode mandar `categoryId`/`brandId`/etc
 * apontando para um recurso de outro tenant — o Prisma persiste alegremente
 * (constraint de FK é tenant-agnóstica) e o produto fica linkado a dado
 * alheio. Ao listar com `include`, o tenant vê o nome do recurso de outra
 * conta — vazamento cross-tenant.
 *
 * Aceita qualquer model que tenha `findFirst`; chama com filtro composto por
 * id + userId; lança mensagem em pt-BR alinhada às demais do projeto.
 */
async function assertOwnership(
  model: { findFirst: (args: any) => Promise<{ id: number } | null> },
  id: number,
  userId: number,
  notFoundMessage: string
): Promise<void> {
  const exists = await model.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!exists) {
    throw new Error(notFoundMessage);
  }
}

/**
 * Valida ownership das 4 FKs de catálogo aceitas pelo ProductService.
 * `null` é tratado como "desvincular" (válido); apenas valores numéricos
 * (IDs concretos) são validados. Roda em paralelo para minimizar latência.
 */
async function assertProductForeignKeysOwnership(
  userId: number,
  data: {
    categoryId?: number | null;
    brandId?: number | null;
    collectionId?: number | null;
    supplierId?: number | null;
  }
): Promise<void> {
  const checks: Promise<void>[] = [];
  if (typeof data.categoryId === 'number') {
    checks.push(assertOwnership(prisma.productCategory, data.categoryId, userId, 'Categoria não encontrada'));
  }
  if (typeof data.brandId === 'number') {
    checks.push(assertOwnership(prisma.productBrand, data.brandId, userId, 'Marca não encontrada'));
  }
  if (typeof data.collectionId === 'number') {
    checks.push(assertOwnership(prisma.productCollection, data.collectionId, userId, 'Coleção não encontrada'));
  }
  if (typeof data.supplierId === 'number') {
    checks.push(assertOwnership(prisma.supplier, data.supplierId, userId, 'Fornecedor não encontrado'));
  }
  await Promise.all(checks);
}

function normalizeSkuPrefix(raw: string): string {
  const cleaned = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3);
  return cleaned.length === 0 ? SKU_DEFAULT_PREFIX : cleaned.padEnd(3, 'X');
}

async function generateSKU(userId: number, categoryId?: number | null): Promise<string> {
  let prefix = SKU_DEFAULT_PREFIX;

  if (categoryId) {
    const category = await prisma.productCategory.findFirst({
      where: { id: categoryId, userId },
      select: { name: true },
    });
    if (category) {
      prefix = normalizeSkuPrefix(category.name);
    }
  }

  const pattern = `${prefix}-`;
  const last = await prisma.product.findFirst({
    where: {
      userId,
      code: { startsWith: pattern },
    },
    select: { code: true },
    orderBy: { code: 'desc' },
  });

  let nextNum = 1;
  if (last) {
    const match = last.code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(SKU_SEQ_PAD, '0')}`;
}

interface ProductData {
  name: string;
  code?: string;
  category?: string;
  quantityStock?: number;
  priceCost?: number;
  priceSale?: number;
  supplierId?: number;
  minStock?: number;
  unitType?: string;
  categoryId?: number;
  brandId?: number;
  collectionId?: number;
  barcode?: string;
  observations?: string;
  markup?: number;
  maxStock?: number;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  ncm?: string;
  cest?: string;
  cfop?: string;
  icmsOrigin?: string;
  icmsCst?: string;
  ecommerceActive?: boolean;
  ecommerceDescription?: string;
  ecommerceSeoTitle?: string;
  ecommerceSeoDescription?: string;
  images?: string[];
}

export class ProductService {
  static async createProduct(userId: number, data: ProductData) {
    // Valida ownership das FKs ANTES de gerar SKU/criar — qualquer ID de outro
    // tenant é rejeitado com 400 (mapeado pela rota).
    await assertProductForeignKeysOwnership(userId, {
      categoryId: data.categoryId,
      brandId: data.brandId,
      collectionId: data.collectionId,
      supplierId: data.supplierId,
    });

    const barcode = data.barcode || generateEAN13();

    const MAX_ATTEMPTS = 5;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const generatedCode = await generateSKU(userId, data.categoryId ?? null);

      try {
        const product = await prisma.product.create({
          data: {
            userId,
            name: data.name,
            code: generatedCode,
            category: data.category || null,
            quantityStock: data.quantityStock || 0,
            priceCost: data.priceCost ?? null,
            priceSale: data.priceSale ?? null,
            supplierId: data.supplierId || null,
            minStock: data.minStock ?? null,
            unitType: data.unitType || null,
            categoryId: data.categoryId || null,
            brandId: data.brandId || null,
            collectionId: data.collectionId || null,
            barcode,
            observations: data.observations || null,
            markup: data.markup ?? null,
            maxStock: data.maxStock ?? null,
            weight: data.weight ?? null,
            height: data.height ?? null,
            width: data.width ?? null,
            depth: data.depth ?? null,
            ncm: data.ncm || null,
            cest: data.cest || null,
            cfop: data.cfop || null,
            icmsOrigin: data.icmsOrigin || null,
            icmsCst: data.icmsCst || null,
            ecommerceActive: data.ecommerceActive ?? false,
            ecommerceDescription: data.ecommerceDescription || null,
            ecommerceSeoTitle: data.ecommerceSeoTitle || null,
            ecommerceSeoDescription: data.ecommerceSeoDescription || null,
          },
          include: { images: true },
        });

        if (data.images && data.images.length > 0) {
          await prisma.productImage.createMany({
            data: data.images.map((url, index) => ({
              productId: product.id,
              url,
              position: index,
            })),
          });
        }

        return await prisma.product.findUnique({
          where: { id: product.id },
          include: { images: { orderBy: { position: 'asc' } } },
        });
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Não foi possível gerar um SKU único após múltiplas tentativas');
  }

  static async getProductsByUser(userId: number, limit: number = 100, offset: number = 0) {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          images: { orderBy: { position: 'asc' } },
          productCategory: true,
          productBrand: true,
          productCollection: true,
          supplier: true,
        },
      }),
      prisma.product.count({ where: { userId } }),
    ]);

    return { products, total };
  }

  static async getProductById(userId: number, productId: number) {
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
      include: {
        images: { orderBy: { position: 'asc' } },
        productCategory: true,
        productBrand: true,
        productCollection: true,
        supplier: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  static async updateProduct(
    userId: number,
    productId: number,
    updates: Partial<ProductData>
  ) {
    await this.getProductById(userId, productId);

    // Valida ownership de FKs que vieram com valor numérico no update.
    // `null` é desvincular (permitido), `undefined` é "não tocar" (ignora).
    await assertProductForeignKeysOwnership(userId, {
      categoryId: updates.categoryId,
      brandId: updates.brandId,
      collectionId: updates.collectionId,
      supplierId: updates.supplierId,
    });

    try {
      const data: any = {};
      const fields = [
        'name', 'code', 'category', 'quantityStock', 'priceCost', 'priceSale',
        'minStock', 'unitType', 'categoryId', 'brandId', 'collectionId',
        'barcode', 'observations', 'markup', 'maxStock', 'supplierId',
        'weight', 'height', 'width', 'depth',
        'ncm', 'cest', 'cfop', 'icmsOrigin', 'icmsCst',
        'ecommerceActive', 'ecommerceDescription', 'ecommerceSeoTitle', 'ecommerceSeoDescription',
      ];

      for (const field of fields) {
        if ((updates as any)[field] !== undefined) {
          data[field] = (updates as any)[field];
        }
      }

      const product = await prisma.product.update({
        where: { id: productId },
        data,
        include: { images: { orderBy: { position: 'asc' } } },
      });

      if (updates.images !== undefined) {
        await prisma.productImage.deleteMany({ where: { productId } });
        if (updates.images.length > 0) {
          await prisma.productImage.createMany({
            data: updates.images.map((url, index) => ({
              productId,
              url,
              position: index,
            })),
          });
        }
      }

      return await prisma.product.findUnique({
        where: { id: productId },
        include: {
          images: { orderBy: { position: 'asc' } },
          productCategory: true,
          productBrand: true,
          productCollection: true,
          supplier: true,
        },
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Código do produto já existe para este usuário');
      }
      throw error;
    }
  }

  static async deleteProduct(userId: number, productId: number) {
    await this.getProductById(userId, productId);

    await prisma.product.delete({ where: { id: productId } });

    return { message: 'Product deleted successfully' };
  }

  static async getLowStockProducts(userId: number) {
    const products = await prisma.product.findMany({
      where: {
        userId,
        minStock: { not: null },
      },
      orderBy: { quantityStock: 'asc' },
    });
    return products.filter(p => p.quantityStock <= (p.minStock ?? 0));
  }
}
