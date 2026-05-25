import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductForm from './ProductForm';
import { productService } from '../../services/productService';

vi.mock('../../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getLowStockProducts: vi.fn(),
  },
}));

const mockedCreate = vi.mocked(productService.createProduct);
const mockedUpdate = vi.mocked(productService.updateProduct);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProductForm — modo criação', () => {
  it('renderiza título "Cadastrar Produto" e campos principais', () => {
    render(<ProductForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Cadastrar Produto')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Produto/)).toBeInTheDocument();
  });

  it('rejeita submit sem nome ou priceSale', async () => {
    const user = userEvent.setup();
    render(<ProductForm onSuccess={vi.fn()} />);
    // Submete o form direto
    const form = screen.getByRole('button', { name: /Cadastrar|Salvar/i }).closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText('Nome e Preço de Venda são obrigatórios')).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('NÃO envia campo code em criação (SKU é gerado pelo backend)', async () => {
    mockedCreate.mockResolvedValue({ id: 1, name: 'X' });
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<ProductForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/Nome do Produto/), 'Camiseta');
    await user.type(screen.getByLabelText(/Preço de Venda/), '99.90');
    const form = screen.getByRole('button', { name: /Cadastrar|Salvar/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    const sent = mockedCreate.mock.calls[0][0];
    expect(sent).not.toHaveProperty('code');
    expect(sent.name).toBe('Camiseta');
    expect(sent.priceSale).toBe(99.9);
  });

  it('exibe mensagem de sucesso e chama onSuccess após delay', async () => {
    mockedCreate.mockResolvedValue({ id: 1 });
    vi.useFakeTimers();
    const onSuccess = vi.fn();
    render(<ProductForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Nome do Produto/), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/), { target: { value: '10' } });
    fireEvent.submit(screen.getByRole('button', { name: /Cadastrar|Salvar/i }).closest('form')!);

    await vi.waitFor(() => {
      expect(screen.getByText('Produto cadastrado com sucesso!')).toBeInTheDocument();
    });

    vi.advanceTimersByTime(1100);
    expect(onSuccess).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('exibe erro do servidor quando create falha', async () => {
    mockedCreate.mockRejectedValue({ response: { data: { error: 'SKU já existe' } } });
    render(<ProductForm onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nome do Produto/), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/), { target: { value: '10' } });
    fireEvent.submit(screen.getByRole('button', { name: /Cadastrar|Salvar/i }).closest('form')!);

    expect(await screen.findByText('SKU já existe')).toBeInTheDocument();
  });
});

describe('ProductForm — modo edição', () => {
  it('renderiza "Editar Produto" e pré-popula campos quando initialProduct é passado', () => {
    render(
      <ProductForm
        onSuccess={vi.fn()}
        initialProduct={{ id: 5, name: 'Antigo', code: 'TST-001', priceSale: 150, quantityStock: 20 }}
      />
    );
    expect(screen.getByText('Editar Produto')).toBeInTheDocument();
    expect((screen.getByLabelText(/Nome do Produto/) as HTMLInputElement).value).toBe('Antigo');
    expect((screen.getByLabelText(/Preço de Venda/) as HTMLInputElement).value).toBe('150');
  });

  it('em edição, ENVIA o code (permite correção manual)', async () => {
    mockedUpdate.mockResolvedValue({ id: 5, name: 'X' });
    render(
      <ProductForm
        onSuccess={vi.fn()}
        initialProduct={{ id: 5, name: 'X', code: 'TST-001', priceSale: 100 }}
      />
    );

    fireEvent.submit(screen.getByRole('button', { name: /Cadastrar|Salvar|Atualizar/i }).closest('form')!);

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    const [id, sent] = mockedUpdate.mock.calls[0];
    expect(id).toBe(5);
    expect(sent.code).toBe('TST-001');
  });
});
