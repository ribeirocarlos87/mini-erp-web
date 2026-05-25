import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerClientePage from './VerClientePage';
import { clientService } from '../../services/clientService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '5' }),
  };
});

vi.mock('../../services/clientService', () => ({
  clientService: {
    getClient: vi.fn(),
    getClientPurchases: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (clientService.getClient as any).mockResolvedValue({
    id: 5,
    name: 'João da Silva',
    cpfCnpj: '12345678900',
    email: 'joao@test.com',
    phone: '11999998888',
    creditBalance: '250.00',
    createdAt: '2026-01-15',
  });
  (clientService.getClientPurchases as any).mockResolvedValue({
    sales: [
      {
        id: 1,
        totalValue: '300.00',
        subtotal: '300.00',
        discount: '0',
        surcharge: '0',
        saleDate: '2026-03-10',
        createdAt: '2026-03-10T10:00:00Z',
        seller: null,
        items: [],
        payments: [],
      },
    ],
    total: 1,
    stats: {
      totalSales: 1,
      totalSpent: 300,
      averageTicket: 300,
      firstPurchaseDate: '2026-03-10',
      lastPurchaseDate: '2026-03-10',
    },
    page: 1,
    limit: 50,
    totalPages: 1,
  });
});

describe('VerClientePage', () => {
  it('chama getClient e getClientPurchases com o id da rota', async () => {
    render(
      <MemoryRouter>
        <VerClientePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(clientService.getClient).toHaveBeenCalledWith(5);
      expect(clientService.getClientPurchases).toHaveBeenCalled();
    });
  });

  it('renderiza nome e telefone formatado do cliente', async () => {
    render(
      <MemoryRouter>
        <VerClientePage />
      </MemoryRouter>
    );
    expect(await screen.findByText('João da Silva')).toBeInTheDocument();
    // Telefone formatado (11999998888 → (11) 99999-8888)
    // Telefone está em span junto com SVG; usar matcher por textContent.
    await waitFor(() => {
      const span = Array.from(document.querySelectorAll('span')).find((s) =>
        (s.textContent || '').includes('(11) 99999-8888')
      );
      expect(span).toBeTruthy();
    });
  });
});
