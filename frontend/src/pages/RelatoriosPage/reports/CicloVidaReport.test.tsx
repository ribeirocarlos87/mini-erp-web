import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CicloVidaReport from './CicloVidaReport';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/reportService', () => ({
  reportService: { clientLifecycleReport: vi.fn().mockResolvedValue({ summary: { segments: {} }, rows: [] }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CicloVidaReport', () => {
  it('smoke render', () => {
    const { container } = render(
      <MemoryRouter>
        <CicloVidaReport />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
