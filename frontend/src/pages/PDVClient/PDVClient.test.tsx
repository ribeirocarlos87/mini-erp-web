import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDVClient from './PDVClient';
import { clientService } from '../../services/clientService';
import { usePDVStore } from '../../store/pdvStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/clientService', () => ({
  clientService: { getClients: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
  (clientService.getClients as any).mockResolvedValue({
    clients: [
      { id: 1, name: 'Cliente A', email: 'a@b.com', cpfCnpj: '12345678900', creditBalance: 100 },
    ],
  });
});

describe('PDVClient', () => {
  it('chama getClients ao montar e renderiza items', async () => {
    render(
      <MemoryRouter>
        <PDVClient />
      </MemoryRouter>
    );
    expect(clientService.getClients).toHaveBeenCalled();
    expect(await screen.findByText('Cliente A')).toBeInTheDocument();
  });

  it('aceita resposta como array ou { clients }', async () => {
    (clientService.getClients as any).mockResolvedValue([{ id: 9, name: 'Array Cliente', email: 'x@y.com' }]);
    render(
      <MemoryRouter>
        <PDVClient />
      </MemoryRouter>
    );
    expect(await screen.findByText('Array Cliente')).toBeInTheDocument();
  });
});
