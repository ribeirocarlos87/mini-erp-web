import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { employeeService } from './employeeService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('employeeService', () => {
  it('getAll chama GET /employees', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await employeeService.getAll();
    expect(mocked.get).toHaveBeenCalledWith('/employees');
  });

  it('create envia POST /employees com data', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1, name: 'X', active: true } });
    await employeeService.create({ name: 'X', role: 'Vendedor' });
    expect(mocked.post).toHaveBeenCalledWith('/employees', { name: 'X', role: 'Vendedor' });
  });

  it('update usa PUT /employees/:id', async () => {
    mocked.put.mockResolvedValue({ data: {} });
    await employeeService.update(2, { active: false });
    expect(mocked.put).toHaveBeenCalledWith('/employees/2', { active: false });
  });

  it('delete usa DELETE /employees/:id', async () => {
    mocked.delete.mockResolvedValue({ data: {} });
    await employeeService.delete(3);
    expect(mocked.delete).toHaveBeenCalledWith('/employees/3');
  });
});
