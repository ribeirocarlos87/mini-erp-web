import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { authService, productService } from './productService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService (em productService.ts)', () => {
  it('register chama POST /auth/register com payload', async () => {
    mocked.post.mockResolvedValue({ data: { user: { id: 1 }, token: 'tk' } });
    const r = await authService.register('Ana', 'a@b.com', 'pwd');
    expect(mocked.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Ana',
      email: 'a@b.com',
      password: 'pwd',
    });
    expect(r.token).toBe('tk');
  });

  it('login chama POST /auth/login', async () => {
    mocked.post.mockResolvedValue({ data: { token: 'xx' } });
    await authService.login('u@v.com', 'pwd');
    expect(mocked.post).toHaveBeenCalledWith('/auth/login', { email: 'u@v.com', password: 'pwd' });
  });
});

describe('productService', () => {
  it('getProducts com paginação', async () => {
    mocked.get.mockResolvedValue({ data: { products: [{ id: 1 }, { id: 2 }] } });
    const r = await productService.getProducts(2, 50);
    expect(mocked.get).toHaveBeenCalledWith('/products', { params: { page: 2, limit: 50 } });
    expect(r).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('getProducts retorna array direto quando response é array', async () => {
    mocked.get.mockResolvedValue({ data: [{ id: 1 }] });
    const r = await productService.getProducts();
    expect(r).toEqual([{ id: 1 }]);
  });

  it('getProducts retorna [] quando data não tem products nem é array', async () => {
    mocked.get.mockResolvedValue({ data: {} });
    expect(await productService.getProducts()).toEqual([]);
  });

  it('getProduct, createProduct, updateProduct, deleteProduct usam URL correta', async () => {
    mocked.get.mockResolvedValue({ data: { id: 5 } });
    mocked.post.mockResolvedValue({ data: { id: 6 } });
    mocked.put.mockResolvedValue({ data: { id: 7 } });
    mocked.delete.mockResolvedValue({ data: { message: 'ok' } });

    await productService.getProduct('5');
    await productService.createProduct({ name: 'X' });
    await productService.updateProduct('7', { name: 'Y' });
    await productService.deleteProduct('8');

    expect(mocked.get).toHaveBeenCalledWith('/products/5');
    expect(mocked.post).toHaveBeenCalledWith('/products', { name: 'X' });
    expect(mocked.put).toHaveBeenCalledWith('/products/7', { name: 'Y' });
    expect(mocked.delete).toHaveBeenCalledWith('/products/8');
  });

  it('getLowStockProducts chama /products/low-stock', async () => {
    mocked.get.mockResolvedValue({ data: { products: [] } });
    await productService.getLowStockProducts();
    expect(mocked.get).toHaveBeenCalledWith('/products/low-stock');
  });
});
