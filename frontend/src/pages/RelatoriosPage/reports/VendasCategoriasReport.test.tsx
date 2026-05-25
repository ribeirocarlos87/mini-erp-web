import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VendasCategoriasReport from './VendasCategoriasReport';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/reportService', () => ({
  reportService: { salesByCategoryReport: vi.fn().mockResolvedValue({ summary: {}, rows: [] }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VendasCategoriasReport', () => {
  it('smoke render', () => {
    const { container } = render(
      <MemoryRouter>
        <VendasCategoriasReport />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
