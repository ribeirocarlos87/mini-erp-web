import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreditoClientesReport from './CreditoClientesReport';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/reportService', () => ({
  reportService: { clientCreditsReport: vi.fn().mockResolvedValue({ summary: {}, rows: [] }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreditoClientesReport', () => {
  it('smoke render', () => {
    const { container } = render(
      <MemoryRouter>
        <CreditoClientesReport />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
