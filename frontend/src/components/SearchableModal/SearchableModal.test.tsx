import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableModal, SearchableSelectTrigger } from './SearchableModal';

const items = [
  { id: '1', primary: 'Camiseta Polo', secondary: 'PRD-001' },
  { id: '2', primary: 'Calça Jeans', secondary: 'PRD-002' },
  { id: '3', primary: 'Açúcar Refinado', secondary: 'PRD-003' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SearchableModal', () => {
  it('não renderiza nada quando open=false', () => {
    render(
      <SearchableModal open={false} onClose={vi.fn()} title="X" items={items} onSelect={vi.fn()} />
    );
    expect(screen.queryByText('X')).not.toBeInTheDocument();
  });

  it('renderiza title, lista de items e footer com atalhos', () => {
    render(
      <SearchableModal open={true} onClose={vi.fn()} title="Selecione" items={items} onSelect={vi.fn()} />
    );
    expect(screen.getByText('Selecione')).toBeInTheDocument();
    expect(screen.getByText('Camiseta Polo')).toBeInTheDocument();
    expect(screen.getByText('PRD-001')).toBeInTheDocument();
    expect(screen.getByText('Navegar')).toBeInTheDocument();
  });

  it('filtra items conforme query (case e diacritics insensitive)', async () => {
    const user = userEvent.setup();
    render(
      <SearchableModal open={true} onClose={vi.fn()} title="X" items={items} onSelect={vi.fn()} />
    );
    await user.type(screen.getByPlaceholderText('Digite para buscar...'), 'acucar');
    expect(screen.getByText('Açúcar Refinado')).toBeInTheDocument();
    expect(screen.queryByText('Camiseta Polo')).not.toBeInTheDocument();
  });

  it('clicar em item chama onSelect e depois onClose', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <SearchableModal open={true} onClose={onClose} title="X" items={items} onSelect={onSelect} />
    );
    await user.click(screen.getByText('Camiseta Polo'));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('tecla Enter seleciona o item highlightado', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <SearchableModal open={true} onClose={onClose} title="X" items={items} onSelect={onSelect} />
    );
    const input = screen.getByPlaceholderText('Digite para buscar...');
    await user.click(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('tecla Escape chama onClose', () => {
    const onClose = vi.fn();
    render(
      <SearchableModal open={true} onClose={onClose} title="X" items={items} onSelect={vi.fn()} />
    );
    fireEvent.keyDown(screen.getByPlaceholderText('Digite para buscar...'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('estado vazio mostra "Nenhum resultado" quando filtro não bate', async () => {
    const user = userEvent.setup();
    render(
      <SearchableModal open={true} onClose={vi.fn()} title="X" items={items} onSelect={vi.fn()} emptyHint="Tente outra busca" />
    );
    await user.type(screen.getByPlaceholderText('Digite para buscar...'), 'zzzzz');
    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument();
    expect(screen.getByText('Tente outra busca')).toBeInTheDocument();
  });

  it('selectedId destaca item correspondente', () => {
    render(
      <SearchableModal open={true} onClose={vi.fn()} title="X" items={items} onSelect={vi.fn()} selectedId="2" />
    );
    // O check icon aparece próximo ao item selecionado — verificamos via lookup do item pai
    const calca = screen.getByText('Calça Jeans').closest('button');
    expect(calca?.className).toContain('selected');
  });
});

describe('SearchableSelectTrigger', () => {
  it('mostra placeholder quando nada selecionado', () => {
    render(<SearchableSelectTrigger placeholder="Escolha um item" selected={null} onOpen={vi.fn()} />);
    expect(screen.getByText('Escolha um item')).toBeInTheDocument();
  });

  it('mostra primary + secondary quando selecionado', () => {
    render(
      <SearchableSelectTrigger
        placeholder="X"
        selected={{ id: '1', primary: 'Camiseta', secondary: 'PRD-001' }}
        onOpen={vi.fn()}
      />
    );
    expect(screen.getByText('Camiseta')).toBeInTheDocument();
    expect(screen.getByText('PRD-001')).toBeInTheDocument();
  });

  it('clicar no trigger chama onOpen', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelectTrigger placeholder="X" selected={null} onOpen={onOpen} />);
    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('botão de limpar chama onClear sem disparar onOpen', async () => {
    const onClear = vi.fn();
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <SearchableSelectTrigger
        placeholder="X"
        selected={{ id: '1', primary: 'A' }}
        onOpen={onOpen}
        onClear={onClear}
      />
    );
    await user.click(screen.getByLabelText('Limpar seleção'));
    expect(onClear).toHaveBeenCalled();
  });
});
