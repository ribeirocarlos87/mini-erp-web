import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CnpjStep } from './steps';

/** Wrapper que mantém estado pra testar input controlado realisticamente. */
const ControlledCnpjStep: React.FC<{ initial?: string | null }> = ({ initial = '' }) => {
  const [value, setValue] = useState<string | null>(initial);
  return <CnpjStep value={value} onChange={setValue} />;
};

describe('CnpjStep', () => {
  it('checkbox de opt-out começa SEMPRE desmarcado, mesmo com value=null', () => {
    render(<CnpjStep value={null} onChange={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    // Input habilitado pra digitação
    const input = screen.getByPlaceholderText('00.000.000/0000-00') as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it('aplica máscara em tempo real ao digitar', async () => {
    const user = userEvent.setup();
    render(<ControlledCnpjStep />);
    const input = screen.getByPlaceholderText('00.000.000/0000-00') as HTMLInputElement;

    await user.type(input, '12345678000190');

    // Após digitar 14 dígitos, o input exibe formatado
    expect(input.value).toBe('12.345.678/0001-90');
  });

  it('marcar opt-out desabilita input e envia null', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CnpjStep value="" onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(null);
    expect(checkbox).toBeChecked();
    const input = screen.getByPlaceholderText('00.000.000/0000-00') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('desmarcar opt-out reabilita input e envia string vazia', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CnpjStep value={null} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox); // marca → manda null
    await user.click(checkbox); // desmarca → manda ''

    expect(onChange).toHaveBeenLastCalledWith('');
    expect(checkbox).not.toBeChecked();
    const input = screen.getByPlaceholderText('00.000.000/0000-00') as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it('exibe CNPJ formatado quando value tem dígitos', () => {
    render(<CnpjStep value="12345678000190" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('00.000.000/0000-00') as HTMLInputElement;
    expect(input.value).toBe('12.345.678/0001-90');
  });
});
