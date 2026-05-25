import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDVSuccess from './PDVSuccess';
import { usePDVStore } from '../../store/pdvStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

beforeEach(() => {
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
});

describe('PDVSuccess', () => {
  it('renderiza sem crash (smoke)', () => {
    const { container } = render(
      <MemoryRouter>
        <PDVSuccess />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
