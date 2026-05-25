import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LancarDevolucaoPage from './LancarDevolucaoPage';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/saleService', () => ({
  saleService: { searchSales: vi.fn().mockResolvedValue({ sales: [], total: 0 }) },
}));
vi.mock('../../services/clientService', () => ({
  clientService: { getClients: vi.fn().mockResolvedValue({ clients: [] }) },
}));
vi.mock('../../services/productService', () => ({
  productService: { getProducts: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/returnService', () => ({
  returnService: { create: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LancarDevolucaoPage', () => {
  it('renderiza sem crash (smoke test)', () => {
    const { container } = render(
      <MemoryRouter>
        <LancarDevolucaoPage />
      </MemoryRouter>
    );
    // Página tem ao menos algum conteúdo (wizard com filtros, header, etc.)
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('renderiza filtros de busca (data inicial e final)', () => {
    render(
      <MemoryRouter>
        <LancarDevolucaoPage />
      </MemoryRouter>
    );
    // Há campos de data no filtro inicial
    expect(document.querySelectorAll('input[type="date"]').length).toBeGreaterThan(0);
  });
});
