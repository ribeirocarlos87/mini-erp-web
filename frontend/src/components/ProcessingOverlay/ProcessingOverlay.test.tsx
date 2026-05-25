import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProcessingOverlay from './ProcessingOverlay';

describe('ProcessingOverlay', () => {
  it('renderiza com message default "Processando..." quando nenhum prop é passado', () => {
    render(<ProcessingOverlay />);
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('renderiza message customizada quando passada', () => {
    render(<ProcessingOverlay message="Salvando venda" />);
    expect(screen.getByText('Salvando venda')).toBeInTheDocument();
  });

  it('renderiza subtitle quando passado', () => {
    render(<ProcessingOverlay message="X" subtitle="Aguarde alguns instantes" />);
    expect(screen.getByText('Aguarde alguns instantes')).toBeInTheDocument();
  });

  it('não renderiza subtitle quando ausente', () => {
    render(<ProcessingOverlay message="X" />);
    expect(screen.queryByText(/aguarde/i)).not.toBeInTheDocument();
  });
});
