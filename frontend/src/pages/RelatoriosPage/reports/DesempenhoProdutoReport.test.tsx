import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DesempenhoProdutoReport from './DesempenhoProdutoReport';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../services/reportService', () => ({
  reportService: { productPerformanceReport: vi.fn().mockResolvedValue({ summary: {}, rows: [] }) },
}));
vi.mock('../../../services/productCategoryService', () => ({
  productCategoryService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../services/productBrandService', () => ({
  productBrandService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../services/productCollectionService', () => ({
  productCollectionService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../services/supplierService', () => ({
  supplierService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../services/employeeService', () => ({
  employeeService: { getAll: vi.fn().mockResolvedValue([]) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DesempenhoProdutoReport', () => {
  it('smoke render', () => {
    const { container } = render(
      <MemoryRouter>
        <DesempenhoProdutoReport />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
