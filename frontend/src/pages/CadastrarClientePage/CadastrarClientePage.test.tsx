import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CadastrarClientePage from './CadastrarClientePage';
import { clientService } from '../../services/clientService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

vi.mock('../../services/clientService', () => ({
  clientService: {
    getClient: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CadastrarClientePage', () => {
  it('renderiza formulário de cadastro (modo criação)', () => {
    render(
      <MemoryRouter>
        <CadastrarClientePage />
      </MemoryRouter>
    );
    // Botão de submit ou heading
    expect(screen.getByText(/Cadastrar Cliente|Cadastro de Cliente/i)).toBeInTheDocument();
  });

  it('valida nome obrigatório antes de chamar API', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CadastrarClientePage />
      </MemoryRouter>
    );
    // Tenta submeter sem preencher nada
    const saveBtn = screen.getByRole('button', { name: /Salvar|Cadastrar/i });
    await user.click(saveBtn);
    // Service não deve ser chamado quando o nome está vazio
    await waitFor(() => expect(clientService.createClient).not.toHaveBeenCalled());
  });
});
