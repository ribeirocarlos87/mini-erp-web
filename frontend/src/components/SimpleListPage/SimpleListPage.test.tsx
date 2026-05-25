import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SimpleListPage from './SimpleListPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  title: 'Categorias',
  subtitle: 'gerencie as categorias',
  icon: <span data-testid="icon" />,
  backPath: '/gestao-estoque',
  items: [
    { id: 1, name: 'Camisetas' },
    { id: 2, name: 'Calças' },
  ],
  loading: false,
  onCreate: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
};

const renderPage = (overrides = {}) =>
  render(
    <MemoryRouter>
      <SimpleListPage {...defaultProps} {...overrides} />
    </MemoryRouter>
  );

describe('SimpleListPage', () => {
  it('renderiza título, subtitle e tabela com items', () => {
    renderPage();
    expect(screen.getByText('Categorias')).toBeInTheDocument();
    expect(screen.getByText('gerencie as categorias')).toBeInTheDocument();
    expect(screen.getByText('Camisetas')).toBeInTheDocument();
    expect(screen.getByText('Calças')).toBeInTheDocument();
    expect(screen.getByText('2 items encontrados')).toBeInTheDocument();
  });

  it('filtra items pelo searchTerm (case-insensitive)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Buscar...'), 'camis');
    expect(screen.getByText('Camisetas')).toBeInTheDocument();
    expect(screen.queryByText('Calças')).not.toBeInTheDocument();
    expect(screen.getByText('1 item encontrado')).toBeInTheDocument();
  });

  it('estado de loading mostra spinner e texto "Carregando..."', () => {
    renderPage({ loading: true });
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('estado vazio mostra emptyText quando items=[]', () => {
    renderPage({ items: [], emptyText: 'Nenhuma categoria.' });
    expect(screen.getByText('Nenhuma categoria.')).toBeInTheDocument();
  });

  it('clicar em "Criar novo" abre o formulário', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Criar novo/i }));
    expect(screen.getByPlaceholderText('Nome...')).toBeInTheDocument();
  });

  it('submete create e mostra mensagem de sucesso', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage({ onCreate });
    await user.click(screen.getByRole('button', { name: /Criar novo/i }));
    await user.type(screen.getByPlaceholderText('Nome...'), 'Acessórios');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Acessórios'));
    expect(await screen.findByText('Item criado com sucesso!')).toBeInTheDocument();
  });

  it('exibe erro do servidor quando create falha', async () => {
    const onCreate = vi.fn().mockRejectedValue({ response: { data: { error: 'Já existe' } } });
    const user = userEvent.setup();
    renderPage({ onCreate });
    await user.click(screen.getByRole('button', { name: /Criar novo/i }));
    await user.type(screen.getByPlaceholderText('Nome...'), 'X');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Já existe')).toBeInTheDocument();
  });

  it('botão de voltar navega para backPath', async () => {
    const user = userEvent.setup();
    renderPage({ backPath: '/dashboard' });
    const buttons = screen.getAllByRole('button');
    // Primeiro button é o voltar (com ArrowLeft)
    await user.click(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('extraColumns são renderizadas no header e nas linhas', () => {
    renderPage({
      extraColumns: [
        { label: 'Marca', key: 'brand' },
        { label: 'Custo', key: 'cost', render: (it: any) => `R$ ${it.cost ?? 0}` },
      ],
      items: [{ id: 1, name: 'X', brand: 'Y', cost: 99 }],
    });
    expect(screen.getByText('Marca')).toBeInTheDocument();
    expect(screen.getByText('Custo')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('R$ 99')).toBeInTheDocument();
  });
});
