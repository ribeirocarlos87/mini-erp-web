import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientesReport from './ClientesReport';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/reportService', () => ({
  reportService: { clientReport: vi.fn().mockResolvedValue({ summary: {}, rows: [] }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ClientesReport', () => {
  it('smoke render', () => {
    const { container } = render(
      <MemoryRouter>
        <ClientesReport />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
