import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ProductService } from './productService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import {
  createTestUser,
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

describe('ProductService.createProduct', () => {
  it('gera code "PRD-000001" quando não há categoria', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, { name: 'Produto A' });
    expect(p!.code).toBe('PRD-000001');
    expect(p!.userId).toBe(user.id);
  });

  it('incrementa sequência do code para o mesmo prefixo', async () => {
    const user = await createTestUser();
    const p1 = await ProductService.createProduct(user.id, { name: 'A' });
    const p2 = await ProductService.createProduct(user.id, { name: 'B' });
    const p3 = await ProductService.createProduct(user.id, { name: 'C' });
    expect(p1!.code).toBe('PRD-000001');
    expect(p2!.code).toBe('PRD-000002');
    expect(p3!.code).toBe('PRD-000003');
  });

  it('isolamento por tenant: cada user tem própria sequência', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const a1 = await ProductService.createProduct(u1.id, { name: 'A' });
    const a2 = await ProductService.createProduct(u1.id, { name: 'B' });
    const b1 = await ProductService.createProduct(u2.id, { name: 'X' });
    expect(a1!.code).toBe('PRD-000001');
    expect(a2!.code).toBe('PRD-000002');
    expect(b1!.code).toBe('PRD-000001');
  });

  it('usa prefixo derivado da categoria do tenant', async () => {
    const user = await createTestUser();
    const cat = await createTestCategory(user.id, 'Camisetas');
    const p = await ProductService.createProduct(user.id, { name: 'Cam preta', categoryId: cat.id });
    expect(p!.code).toBe('CAM-000001');
  });

  it('normaliza prefixo: remove acentos, espaços e força uppercase', async () => {
    const user = await createTestUser();
    const cat = await createTestCategory(user.id, 'açúcar refinado');
    const p = await ProductService.createProduct(user.id, { name: 'A', categoryId: cat.id });
    expect(p!.code).toBe('ACU-000001');
  });

  it('preenche prefixo curto com X (categoria de 2 letras)', async () => {
    const user = await createTestUser();
    const cat = await createTestCategory(user.id, 'TI');
    const p = await ProductService.createProduct(user.id, { name: 'A', categoryId: cat.id });
    expect(p!.code).toBe('TIX-000001');
  });

  // ── Ownership cross-tenant das 4 FKs de catálogo ──
  // Antes do fix, o ProductService aceitava categoryId/brandId/collectionId/supplierId
  // de outro tenant e gravava silenciosamente. Agora rejeita com 400 (mensagem em pt-BR).

  it('rejeita create com categoryId de outro tenant', async () => {
    const tenant1 = await createTestUser();
    const tenant2 = await createTestUser();
    const catOutro = await createTestCategory(tenant2.id, 'Eletrônicos');
    await expect(
      ProductService.createProduct(tenant1.id, { name: 'A', categoryId: catOutro.id })
    ).rejects.toThrow('Categoria não encontrada');
  });

  it('rejeita create com brandId de outro tenant', async () => {
    const tenant1 = await createTestUser();
    const tenant2 = await createTestUser();
    const brandOutro = await createTestBrand(tenant2.id, 'Nike');
    await expect(
      ProductService.createProduct(tenant1.id, { name: 'A', brandId: brandOutro.id })
    ).rejects.toThrow('Marca não encontrada');
  });

  it('rejeita create com collectionId de outro tenant', async () => {
    const tenant1 = await createTestUser();
    const tenant2 = await createTestUser();
    const colOutro = await prisma.productCollection.create({ data: { userId: tenant2.id, name: 'Verão' } });
    await expect(
      ProductService.createProduct(tenant1.id, { name: 'A', collectionId: colOutro.id })
    ).rejects.toThrow('Coleção não encontrada');
  });

  it('rejeita create com supplierId de outro tenant', async () => {
    const tenant1 = await createTestUser();
    const tenant2 = await createTestUser();
    const supOutro = await createTestSupplier(tenant2.id, 'Fornecedor Alheio');
    await expect(
      ProductService.createProduct(tenant1.id, { name: 'A', supplierId: supOutro.id })
    ).rejects.toThrow('Fornecedor não encontrado');
  });

  it('aceita create com FKs do PRÓPRIO tenant', async () => {
    const user = await createTestUser();
    const cat = await createTestCategory(user.id, 'Roupas');
    const brand = await createTestBrand(user.id, 'Marca Própria');
    const supplier = await createTestSupplier(user.id, 'Fornecedor Local');
    const p = await ProductService.createProduct(user.id, {
      name: 'Produto OK',
      categoryId: cat.id,
      brandId: brand.id,
      supplierId: supplier.id,
    });
    expect(p!.categoryId).toBe(cat.id);
    expect(p!.brandId).toBe(brand.id);
    expect(p!.supplierId).toBe(supplier.id);
  });

  it('gera EAN-13 (13 dígitos, prefixo 789) quando barcode não informado', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, { name: 'A' });
    expect(p!.barcode).toMatch(/^\d{13}$/);
    expect(p!.barcode!.startsWith('789')).toBe(true);
  });

  it('respeita barcode customizado quando informado', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, { name: 'A', barcode: '7891234567890' });
    expect(p!.barcode).toBe('7891234567890');
  });

  it('salva imagens com positions sequenciais começando em 0', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, {
      name: 'A',
      images: ['url1', 'url2', 'url3'],
    });
    expect(p!.images).toHaveLength(3);
    expect(p!.images.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(p!.images.map((i) => i.url)).toEqual(['url1', 'url2', 'url3']);
  });

  it('campos opcionais ficam null/default quando não enviados', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, { name: 'A' });
    expect(p!.priceCost).toBeNull();
    expect(p!.priceSale).toBeNull();
    expect(p!.observations).toBeNull();
    expect(p!.ecommerceActive).toBe(false);
    expect(p!.quantityStock).toBe(0);
  });

  it('persiste ficha fiscal e dimensões quando enviadas', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, {
      name: 'A',
      ncm: '61091000',
      cest: '2806400',
      cfop: '5102',
      icmsOrigin: '0',
      icmsCst: '00',
      weight: 0.5,
      height: 10,
      width: 20,
      depth: 5,
    });
    expect(p!.ncm).toBe('61091000');
    expect(p!.cfop).toBe('5102');
    expect(Number(p!.weight)).toBe(0.5);
    expect(Number(p!.height)).toBe(10);
  });

  it('persiste flags e textos de e-commerce', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, {
      name: 'A',
      ecommerceActive: true,
      ecommerceDescription: 'Descrição longa',
      ecommerceSeoTitle: 'SEO Title',
      ecommerceSeoDescription: 'SEO Desc',
    });
    expect(p!.ecommerceActive).toBe(true);
    expect(p!.ecommerceDescription).toBe('Descrição longa');
    expect(p!.ecommerceSeoTitle).toBe('SEO Title');
  });
});

describe('ProductService.getProductsByUser', () => {
  it('retorna apenas produtos do tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await ProductService.createProduct(u1.id, { name: 'A' });
    await ProductService.createProduct(u1.id, { name: 'B' });
    await ProductService.createProduct(u2.id, { name: 'X' });

    const { products: list1, total: total1 } = await ProductService.getProductsByUser(u1.id);
    expect(list1).toHaveLength(2);
    expect(total1).toBe(2);
    expect(list1.every((p) => p.userId === u1.id)).toBe(true);

    const { products: list2, total: total2 } = await ProductService.getProductsByUser(u2.id);
    expect(list2).toHaveLength(1);
    expect(total2).toBe(1);
  });

  it('respeita limit e offset (paginação)', async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) {
      await ProductService.createProduct(user.id, { name: `P${i}` });
    }
    const page1 = await ProductService.getProductsByUser(user.id, 2, 0);
    const page2 = await ProductService.getProductsByUser(user.id, 2, 2);
    const page3 = await ProductService.getProductsByUser(user.id, 2, 4);
    expect(page1.products).toHaveLength(2);
    expect(page2.products).toHaveLength(2);
    expect(page3.products).toHaveLength(1);
    expect(page1.total).toBe(5);
  });

  it('inclui relações: images, productCategory, productBrand, supplier', async () => {
    const user = await createTestUser();
    const cat = await createTestCategory(user.id, 'cat-x');
    const brand = await createTestBrand(user.id, 'brand-y');
    const supplier = await createTestSupplier(user.id, 'fornecedor-z');
    await ProductService.createProduct(user.id, {
      name: 'A',
      categoryId: cat.id,
      brandId: brand.id,
      supplierId: supplier.id,
      images: ['u1'],
    });
    const { products } = await ProductService.getProductsByUser(user.id);
    expect(products[0].productCategory?.name).toBe('cat-x');
    expect(products[0].productBrand?.name).toBe('brand-y');
    expect(products[0].supplier?.name).toBe('fornecedor-z');
    expect(products[0].images).toHaveLength(1);
  });
});

describe('ProductService.getProductById', () => {
  it('retorna produto do próprio tenant', async () => {
    const user = await createTestUser();
    const created = await ProductService.createProduct(user.id, { name: 'A' });
    const fetched = await ProductService.getProductById(user.id, created!.id);
    expect(fetched.id).toBe(created!.id);
    expect(fetched.name).toBe('A');
  });

  it('throw "Product not found" ao buscar produto de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const p = await ProductService.createProduct(u1.id, { name: 'A' });
    await expect(ProductService.getProductById(u2.id, p!.id)).rejects.toThrow('Product not found');
  });

  it('throw quando produto não existe', async () => {
    const user = await createTestUser();
    await expect(ProductService.getProductById(user.id, 99999)).rejects.toThrow('Product not found');
  });
});

describe('ProductService.updateProduct', () => {
  it('atualiza campos passados, mantém o resto', async () => {
    const user = await createTestUser();
    const created = await ProductService.createProduct(user.id, {
      name: 'Original',
      priceSale: 100,
    });
    const updated = await ProductService.updateProduct(user.id, created!.id, {
      name: 'Novo nome',
    });
    expect(updated!.name).toBe('Novo nome');
    expect(Number(updated!.priceSale)).toBe(100);
  });

  it('rejeita update em produto de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const p = await ProductService.createProduct(u1.id, { name: 'A' });
    await expect(
      ProductService.updateProduct(u2.id, p!.id, { name: 'hack' })
    ).rejects.toThrow('Product not found');
  });

  it('rejeita update do próprio produto setando categoryId de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const p = await ProductService.createProduct(u1.id, { name: 'A' });
    const catOutro = await createTestCategory(u2.id, 'Cat Alheia');
    await expect(
      ProductService.updateProduct(u1.id, p!.id, { categoryId: catOutro.id })
    ).rejects.toThrow('Categoria não encontrada');
  });

  it('rejeita update setando supplierId de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const p = await ProductService.createProduct(u1.id, { name: 'A' });
    const supOutro = await createTestSupplier(u2.id);
    await expect(
      ProductService.updateProduct(u1.id, p!.id, { supplierId: supOutro.id })
    ).rejects.toThrow('Fornecedor não encontrado');
  });

  it('permite update com categoryId=null (desvincular)', async () => {
    const user = await createTestUser();
    const cat = await createTestCategory(user.id);
    const p = await ProductService.createProduct(user.id, { name: 'A', categoryId: cat.id });
    const updated = await ProductService.updateProduct(user.id, p!.id, { categoryId: null as any });
    expect(updated!.categoryId).toBeNull();
  });

  it('rejeita update com code duplicado (mesmo tenant) com mensagem clara', async () => {
    const user = await createTestUser();
    const p1 = await ProductService.createProduct(user.id, { name: 'A' });
    const p2 = await ProductService.createProduct(user.id, { name: 'B' });
    await expect(
      ProductService.updateProduct(user.id, p2!.id, { code: p1!.code })
    ).rejects.toThrow('Código do produto já existe para este usuário');
  });

  it('substitui imagens quando o campo images é enviado', async () => {
    const user = await createTestUser();
    const created = await ProductService.createProduct(user.id, {
      name: 'A',
      images: ['url1', 'url2'],
    });
    const updated = await ProductService.updateProduct(user.id, created!.id, {
      images: ['nova1', 'nova2', 'nova3'],
    });
    expect(updated!.images).toHaveLength(3);
    expect(updated!.images.map((i) => i.url)).toEqual(['nova1', 'nova2', 'nova3']);
  });

  it('zera todas as imagens quando images = []', async () => {
    const user = await createTestUser();
    const created = await ProductService.createProduct(user.id, {
      name: 'A',
      images: ['url1', 'url2'],
    });
    const updated = await ProductService.updateProduct(user.id, created!.id, { images: [] });
    expect(updated!.images).toHaveLength(0);
  });
});

describe('ProductService.deleteProduct', () => {
  it('remove produto do próprio tenant', async () => {
    const user = await createTestUser();
    const p = await ProductService.createProduct(user.id, { name: 'A' });
    await ProductService.deleteProduct(user.id, p!.id);
    await expect(ProductService.getProductById(user.id, p!.id)).rejects.toThrow('Product not found');
  });

  it('rejeita delete em produto de outro tenant', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const p = await ProductService.createProduct(u1.id, { name: 'A' });
    await expect(ProductService.deleteProduct(u2.id, p!.id)).rejects.toThrow('Product not found');

    // E o produto continua lá pro tenant verdadeiro
    const stillThere = await ProductService.getProductById(u1.id, p!.id);
    expect(stillThere.id).toBe(p!.id);
  });
});

describe('ProductService.getLowStockProducts', () => {
  it('retorna apenas produtos com minStock definido e quantityStock abaixo dele', async () => {
    const user = await createTestUser();
    await ProductService.createProduct(user.id, { name: 'sem-min', quantityStock: 0 });
    await ProductService.createProduct(user.id, { name: 'acima', quantityStock: 100, minStock: 10 });
    await ProductService.createProduct(user.id, { name: 'igual', quantityStock: 5, minStock: 5 });
    await ProductService.createProduct(user.id, { name: 'abaixo', quantityStock: 2, minStock: 10 });

    const low = await ProductService.getLowStockProducts(user.id);
    const names = low.map((p) => p.name).sort();
    expect(names).toEqual(['abaixo', 'igual']);
  });

  it('isolamento por tenant em low-stock', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    await ProductService.createProduct(u1.id, { name: 'u1-low', quantityStock: 0, minStock: 5 });
    await ProductService.createProduct(u2.id, { name: 'u2-low', quantityStock: 0, minStock: 5 });

    const low1 = await ProductService.getLowStockProducts(u1.id);
    expect(low1).toHaveLength(1);
    expect(low1[0].name).toBe('u1-low');
  });
});
