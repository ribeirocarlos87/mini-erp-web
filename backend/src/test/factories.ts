import bcrypt from 'bcrypt';
import { prisma } from './db';

let seq = 0;
const nextSeq = () => `${Date.now()}_${++seq}`;

export interface TestUserOverrides {
  email?: string;
  password?: string;
  name?: string;
}

export async function createTestUser(overrides: TestUserOverrides = {}) {
  const password = overrides.password ?? 'TestPassword123';
  const passwordHash = await bcrypt.hash(password, 4);
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user_${nextSeq()}@test.local`,
      passwordHash,
      name: overrides.name ?? 'Test User',
    },
  });
}

export async function createTestCategory(userId: number, name = `cat_${nextSeq()}`) {
  return prisma.productCategory.create({ data: { userId, name } });
}

export async function createTestBrand(userId: number, name = `brand_${nextSeq()}`) {
  return prisma.productBrand.create({ data: { userId, name } });
}

export async function createTestCollection(userId: number, name = `col_${nextSeq()}`) {
  return prisma.productCollection.create({ data: { userId, name } });
}

export async function createTestSupplier(userId: number, name = `supplier_${nextSeq()}`) {
  return prisma.supplier.create({ data: { userId, name } });
}

export interface TestProductOverrides {
  name?: string;
  code?: string;
  priceSale?: number;
  priceCost?: number;
  quantityStock?: number;
  categoryId?: number;
  brandId?: number;
  supplierId?: number;
}

export async function createTestProduct(userId: number, overrides: TestProductOverrides = {}) {
  return prisma.product.create({
    data: {
      userId,
      name: overrides.name ?? `Product ${nextSeq()}`,
      code: overrides.code ?? `TST-${nextSeq()}`,
      priceSale: overrides.priceSale ?? 100,
      priceCost: overrides.priceCost ?? 50,
      quantityStock: overrides.quantityStock ?? 10,
      categoryId: overrides.categoryId ?? null,
      brandId: overrides.brandId ?? null,
      supplierId: overrides.supplierId ?? null,
    },
  });
}

export interface TestClientOverrides {
  name?: string;
  cpfCnpj?: string;
  email?: string;
  creditBalance?: number;
}

export async function createTestClient(userId: number, overrides: TestClientOverrides = {}) {
  return prisma.client.create({
    data: {
      userId,
      name: overrides.name ?? `Client ${nextSeq()}`,
      cpfCnpj: overrides.cpfCnpj ?? null,
      email: overrides.email ?? null,
      creditBalance: overrides.creditBalance ?? 0,
    },
  });
}

export async function createTestEmployee(userId: number, name = `seller_${nextSeq()}`) {
  return prisma.employee.create({ data: { userId, name } });
}
