import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmpresaCard from './EmpresaCard';

vi.mock('../../../services/settingsService', () => ({
  settingsService: {
    getCompany: vi.fn().mockResolvedValue({ name: 'Empresa Teste', cnpj: null, email: null, phone: null, address: null, logo: null }),
    upsertCompany: vi.fn(),
  },
}));

describe('EmpresaCard', () => {
  it('renders without crashing', () => {
    render(<EmpresaCard />);
    expect(screen.getByText('🏢 Dados da Empresa')).toBeTruthy();
  });

  it('renders save button', () => {
    render(<EmpresaCard />);
    expect(screen.getByText('Salvar empresa')).toBeTruthy();
  });
});
