import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmpresaCard from './EmpresaCard';
import { settingsService } from '../../../services/settingsService';

vi.mock('../../../services/settingsService', () => ({
  settingsService: {
    getCompany: vi.fn(),
    upsertCompany: vi.fn(),
  },
}));

const mockGetCompany = vi.mocked(settingsService.getCompany);
const mockUpsertCompany = vi.mocked(settingsService.upsertCompany);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCompany.mockResolvedValue({ id: 1, userId: 1, name: 'Empresa Teste', cnpj: null, email: null, phone: null, address: null, logo: null });
});

describe('EmpresaCard — renderização', () => {
  it('renders the card title', () => {
    render(<EmpresaCard />);
    expect(screen.getByText('🏢 Dados da Empresa')).toBeTruthy();
  });

  it('renders save button', () => {
    render(<EmpresaCard />);
    expect(screen.getByText('Salvar empresa')).toBeTruthy();
  });

  it('loads company data on mount', async () => {
    mockGetCompany.mockResolvedValue({ id: 1, userId: 1, name: 'ACME', cnpj: '11222333000181', email: 'a@b.com', phone: '11999990000', address: 'Rua X', logo: null });
    render(<EmpresaCard />);
    await waitFor(() => {
      expect((screen.getByDisplayValue('ACME') as HTMLInputElement).value).toBe('ACME');
    });
  });

  it('formats CNPJ from API on load', async () => {
    mockGetCompany.mockResolvedValue({ id: 1, userId: 1, name: 'X', cnpj: '11222333000181', email: null, phone: null, address: null, logo: null });
    render(<EmpresaCard />);
    await waitFor(() => {
      expect((screen.getByDisplayValue('11.222.333/0001-81') as HTMLInputElement).value).toBe('11.222.333/0001-81');
    });
  });

  it('formats phone from API on load', async () => {
    mockGetCompany.mockResolvedValue({ id: 1, userId: 1, name: 'X', cnpj: null, email: null, phone: '11999990000', address: null, logo: null });
    render(<EmpresaCard />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('(11) 99999-0000')).toBeTruthy();
    });
  });
});

describe('EmpresaCard — máscara de CNPJ', () => {
  it('formats CNPJ as user types', async () => {
    const user = userEvent.setup();
    render(<EmpresaCard />);
    const input = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(input, '11222333000181');
    expect((input as HTMLInputElement).value).toBe('11.222.333/0001-81');
  });

  it('limits CNPJ to 14 digits', async () => {
    const user = userEvent.setup();
    render(<EmpresaCard />);
    const input = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(input, '112223330001819999');
    const digits = (input as HTMLInputElement).value.replace(/\D/g, '');
    expect(digits.length).toBeLessThanOrEqual(14);
  });
});

describe('EmpresaCard — máscara de telefone', () => {
  it('formats 11-digit phone', async () => {
    const user = userEvent.setup();
    render(<EmpresaCard />);
    const input = screen.getByPlaceholderText('(00) 00000-0000');
    await user.type(input, '11999990000');
    expect((input as HTMLInputElement).value).toBe('(11) 99999-0000');
  });

  it('formats 10-digit phone', async () => {
    const user = userEvent.setup();
    render(<EmpresaCard />);
    const input = screen.getByPlaceholderText('(00) 00000-0000');
    await user.type(input, '1133330000');
    expect((input as HTMLInputElement).value).toBe('(11) 3333-0000');
  });
});

describe('EmpresaCard — validação', () => {
  it('shows error when name is empty', async () => {
    const user = userEvent.setup();
    mockGetCompany.mockResolvedValue({ id: 1, userId: 1, name: '', cnpj: null, email: null, phone: null, address: null, logo: null });
    render(<EmpresaCard />);
    await waitFor(() => screen.getByText('Salvar empresa'));
    const nameInput = screen.getAllByRole('textbox')[0];
    await user.clear(nameInput);
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeTruthy();
    });
    expect(mockUpsertCompany).not.toHaveBeenCalled();
  });

  it('shows error for invalid CNPJ', async () => {
    const user = userEvent.setup();
    render(<EmpresaCard />);
    const cnpjInput = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(cnpjInput, '11111111111111');
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => {
      expect(screen.getByText('CNPJ inválido')).toBeTruthy();
    });
    expect(mockUpsertCompany).not.toHaveBeenCalled();
  });

  it('accepts a valid CNPJ', async () => {
    const user = userEvent.setup();
    mockUpsertCompany.mockResolvedValue({ id: 1, userId: 1, name: 'Empresa Teste', cnpj: '11222333000181', email: null, phone: null, address: null, logo: null });
    render(<EmpresaCard />);
    await waitFor(() => screen.getByDisplayValue('Empresa Teste'));
    const cnpjInput = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(cnpjInput, '11222333000181');
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => {
      expect(mockUpsertCompany).toHaveBeenCalled();
    });
    expect(screen.queryByText('CNPJ inválido')).toBeNull();
  });

  it('shows error for invalid email', async () => {
    const user = userEvent.setup();
    render(<EmpresaCard />);
    await waitFor(() => screen.getByDisplayValue('Empresa Teste'));
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(emailInput, 'nao-e-email');
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeTruthy();
    });
    expect(mockUpsertCompany).not.toHaveBeenCalled();
  });

  it('clears field error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<EmpresaCard />);
    const cnpjInput = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(cnpjInput, '00000000000000');
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => expect(screen.getByText('CNPJ inválido')).toBeTruthy());
    await user.clear(cnpjInput);
    await user.type(cnpjInput, '1');
    await waitFor(() => {
      expect(screen.queryByText('CNPJ inválido')).toBeNull();
    });
  });
});

describe('EmpresaCard — salvar', () => {
  it('strips mask before calling upsertCompany', async () => {
    const user = userEvent.setup();
    mockUpsertCompany.mockResolvedValue({ id: 1, userId: 1, name: 'Empresa Teste', cnpj: '11222333000181', email: null, phone: '11999990000', address: null, logo: null });
    render(<EmpresaCard />);
    await waitFor(() => screen.getByDisplayValue('Empresa Teste'));
    await user.type(screen.getByPlaceholderText('00.000.000/0001-00'), '11222333000181');
    await user.type(screen.getByPlaceholderText('(00) 00000-0000'), '11999990000');
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => {
      const call = mockUpsertCompany.mock.calls[0][0];
      expect(call.cnpj).toBe('11222333000181');
      expect(call.phone).toBe('11999990000');
    });
  });

  it('shows success message after save', async () => {
    const user = userEvent.setup();
    mockUpsertCompany.mockResolvedValue({ id: 1, userId: 1, name: 'Empresa Teste', cnpj: null, email: null, phone: null, address: null, logo: null });
    render(<EmpresaCard />);
    await waitFor(() => screen.getByDisplayValue('Empresa Teste'));
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => {
      expect(screen.getByText('Empresa salva com sucesso')).toBeTruthy();
    });
  });

  it('shows error message on API failure', async () => {
    const user = userEvent.setup();
    mockUpsertCompany.mockRejectedValue({ response: { data: { error: 'Erro do servidor' } } });
    render(<EmpresaCard />);
    await waitFor(() => screen.getByDisplayValue('Empresa Teste'));
    await user.click(screen.getByText('Salvar empresa'));
    await waitFor(() => {
      expect(screen.getByText('Erro do servidor')).toBeTruthy();
    });
  });
});
