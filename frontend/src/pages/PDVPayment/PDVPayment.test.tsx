import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDVPayment from './PDVPayment';
import { usePDVStore } from '../../store/pdvStore';

beforeEach(() => {
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
});

describe('PDVPayment', () => {
  it('renderiza sem crash (smoke)', () => {
    const { container } = render(
      <MemoryRouter>
        <PDVPayment />
      </MemoryRouter>
    );
    expect(container.children.length).toBeGreaterThan(0);
  });
});
