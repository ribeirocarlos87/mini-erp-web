import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FornecedoresPage from './FornecedoresPage';
import { supplierService } from '../../services/supplierService';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/supplierService', () => ({
  supplierService: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (supplierService.getAll as any).mockResolvedValue([{ id: 1, name: 'Fornecedor X' }]);
});

describe('FornecedoresPage', () => {
  it('renderiza título "Fornecedores" e items vindos do service', async () => {
    render(
      <MemoryRouter>
        <FornecedoresPage />
      </MemoryRouter>
    );
    expect(supplierService.getAll).toHaveBeenCalled();
    expect(await screen.findByText('Fornecedor X')).toBeInTheDocument();
    expect(screen.getByText('Fornecedores', { selector: 'h1' })).toBeInTheDocument();
  });
});
