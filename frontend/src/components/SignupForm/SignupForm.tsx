import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';
import styles from './SignupForm.module.css';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState('');
  const [isLoading, setIsLoading]         = useState(false);

  const navigate      = useNavigate();
  const login         = useAuthStore((state) => state.login);
  const setStoreError = useAuthStore((state) => state.setError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register(name, email, password);
      login(response.user, response.token);
      navigate(response.user.onboardingCompletedAt ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      let msg = 'Falha ao cadastrar';
      if (err.response?.status === 409)          msg = 'Este e-mail já está cadastrado';
      else if (err.response?.data?.error)        msg = err.response.data.error;
      else if (err.message === 'Network Error')  msg = 'Erro de conexão. Verifique sua internet';
      setError(msg);
      setStoreError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} ${styles.signupForm}`}>
      <h2>Criar conta</h2>

      {error && (
        <div className={styles.errorMessage}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="signup-name">Nome Completo</label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="João Silva"
          required
          disabled={isLoading}
          autoComplete="name"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.formGroup}>
          <label htmlFor="signup-password">Senha</label>
          <div className={styles.passwordWrapper}>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="signup-confirm">Confirmar</label>
          <div className={styles.passwordWrapper}>
            <input
              id="signup-confirm"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {showConfirm ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Criando conta…' : 'Criar conta'}
      </button>

      {/* formSwitch hidden inside AuthPage, visible standalone */}
      <p className={styles.formSwitch}>
        Já tem uma conta?{' '}
        <button type="button" onClick={onSwitchToLogin} className={styles.linkButton} disabled={isLoading}>
          Faça login
        </button>
      </p>
    </form>
  );
};

export default SignupForm;