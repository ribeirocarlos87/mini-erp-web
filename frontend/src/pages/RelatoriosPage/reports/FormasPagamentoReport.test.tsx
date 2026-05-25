import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FormasPagamentoReport from './FormasPagamentoReport';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/reportService', () => ({
  reportService: { paymentMethodsReport: vi.fn().mockResolvedValue({ summary: {}, rows: [] }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FormasPagamentoReport', () => {
  it('smoke render', () => {
    const { container } = render(
      <MemoryRouter>
        <FormasPagamentoReport />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
