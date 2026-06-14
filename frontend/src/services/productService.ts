import apiClient from './api';

export interface ProductFormData {
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

export const authService = {
  register: async (name: string, email: string, password: string) => {
    const response = await apiClient.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },
};

export const productService = {
  getProducts: async (page: number = 1, limit: number = 100) => {
    try {
      const response = await apiClient.get('/products', {
        params: { page, limit },
      });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.products || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  getProduct: async (id: string) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData: any) => {
    const response = await apiClient.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id: string, productData: any) => {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  getLowStockProducts: async () => {
    const response = await apiClient.get('/products/low-stock');
    return response.data;
  },
};
