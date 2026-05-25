import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Vitest + Testing Library smoke', () => {
  it('renderiza um elemento e encontra texto', () => {
    render(<div>hello mini erp</div>);
    expect(screen.getByText('hello mini erp')).toBeInTheDocument();
  });

  it('atribui matchers do jest-dom corretamente', () => {
    render(<button disabled>botao</button>);
    expect(screen.getByRole('button', { name: 'botao' })).toBeDisabled();
  });
});
