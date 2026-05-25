import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WelcomeOverlay from './WelcomeOverlay';
import { useAuthStore } from '../../store/authStore';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    token: null,
    isLoading: false,
    error: null,
    justLoggedIn: false,
  });
});

describe('WelcomeOverlay', () => {
  it('retorna null quando justLoggedIn=false (já encerrou)', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', name: 'João' },
      justLoggedIn: false,
    });
    const { container } = render(<WelcomeOverlay />);
    // useEffect roda síncrono em RTL → setPhase('done') → return null
    expect(container.innerHTML).toBe('');
  });

  it('renderiza "Bem-vindo de volta" + primeiro nome quando justLoggedIn=true', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', name: 'João Silva Santos' },
      justLoggedIn: true,
    });
    render(<WelcomeOverlay />);
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('extrai apenas o primeiro nome do user.name', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', name: 'Maria   da   Silva' },
      justLoggedIn: true,
    });
    render(<WelcomeOverlay />);
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('quando user é null, primeiro nome fica vazio mas overlay ainda monta', () => {
    useAuthStore.setState({ user: null, justLoggedIn: true });
    render(<WelcomeOverlay />);
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
  });
});
