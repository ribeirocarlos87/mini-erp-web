import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DFCReport from './DFCReport';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/reportService', () => ({
  reportService: { cashFlowReport: vi.fn().mockResolvedValue({ summary: {}, entries: [] }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DFCReport', () => {
  it('smoke render', () => {
    const { container } = render(
      <MemoryRouter>
        <DFCReport />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
