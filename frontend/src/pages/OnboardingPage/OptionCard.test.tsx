import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OptionCard from './OptionCard';

describe('OptionCard', () => {
  it('renderiza label e description', () => {
    render(<OptionCard label="Produtos" description="Vendo coisas" selected={false} onClick={() => {}} />);
    expect(screen.getByText('Produtos')).toBeInTheDocument();
    expect(screen.getByText('Vendo coisas')).toBeInTheDocument();
  });

  it('clique chama onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<OptionCard label="X" selected={false} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('selected=true marca aria-pressed', () => {
    render(<OptionCard label="X" selected={true} onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('disabled bloqueia clique', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<OptionCard label="X" selected={false} onClick={onClick} disabled />);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
