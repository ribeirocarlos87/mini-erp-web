import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConfiguracoesPage from './ConfiguracoesPage';

vi.mock('./components/ContaCard', () => ({ default: () => <div>ContaCard</div> }));
vi.mock('./components/EmpresaCard', () => ({ default: () => <div>EmpresaCard</div> }));
vi.mock('./components/AparenciaCard', () => ({ default: () => <div>AparenciaCard</div> }));
vi.mock('./components/NotificacoesCard', () => ({ default: () => <div>NotificacoesCard</div> }));

describe('ConfiguracoesPage', () => {
  it('renders all four cards', () => {
    render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
    expect(screen.getByText('ContaCard')).toBeTruthy();
    expect(screen.getByText('EmpresaCard')).toBeTruthy();
    expect(screen.getByText('AparenciaCard')).toBeTruthy();
    expect(screen.getByText('NotificacoesCard')).toBeTruthy();
  });

  it('renders page title', () => {
    render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeTruthy();
  });
});
