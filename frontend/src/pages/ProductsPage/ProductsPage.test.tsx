import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from './ProductsPage';
import { productService } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

vi.mock('../../components/ProductForm', () => ({
  default: () => <div data-testid="product-form" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({
    user: { id: 1, email: 'a@b.com', name: 'Admin' },
    token: 'tk',
    justLoggedIn: false,
    error: null,
    isLoading: false,
  });
  (productService.getProducts as any).mockResolvedValue({
    products: [{ id: 1, name: 'P1', code: 'C1', quantityStock: 5 }],
  });
});

describe('ProductsPage (legacy)', () => {
  it('renderiza navbar com user.name e botão de logout', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Welcome, Admin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });

  it('logout chama authStore.logout e navega para /login', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );
    await screen.findByText(/Welcome, Admin/i);
    await user.click(screen.getByRole('button', { name: /Logout/i }));
    expect(useAuthStore.getState().user).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('chama getProducts ao montar e renderiza produtos', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );
    expect(productService.getProducts).toHaveBeenCalled();
    expect(await screen.findByText('P1')).toBeInTheDocument();
  });
});
