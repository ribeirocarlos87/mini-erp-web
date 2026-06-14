import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';
import styles from './LoginForm.module.css';

type View = 'login' | 'forgot' | 'reset';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  resetToken?: string;
  onResetSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, resetToken, onResetSuccess }) => {
  const [view, setView] = useState<View>(resetToken ? 'reset' : 'login');

  // Login state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);

  // Reset state
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Shared
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const login    = useAuthStore((state) => state.login);

  useEffect(() => {
    if (resetToken) setView('reset');
  }, [resetToken]);

  // ── Login submit ──────────────────────────────────────────────────────────

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha e-mail e senha');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await authService.login(email, password);
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err: any) {
      let msg = 'Falha ao fazer login';
      if (err.response?.status === 401)         msg = 'E-mail ou senha incorretos';
      else if (err.response?.data?.error)       msg = err.response.data.error;
      else if (err.message === 'Network Error') msg = 'Erro de conexão. Verifique sua internet';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot submit ─────────────────────────────────────────────────────────

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await authService.forgotPassword(forgotEmail);
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
        setForgotEmail('');
        setView('login');
      }, 3000);
    } catch {
      setError('Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset submit ──────────────────────────────────────────────────────────

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 6;
  const passwordsMatch   = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await authService.resetPassword(resetToken!, newPassword);
      onResetSuccess?.();
      navigate('/login');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Token inválido ou expirado';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render: forgot ────────────────────────────────────────────────────────

  if (view === 'forgot') {
    return (
      <form onSubmit={handleForgotSubmit} className={styles.form}>
        <h2>Recuperar senha</h2>

        {forgotSent ? (
          <div className={styles.successMessage}>
            Link enviado! Verifique seu e-mail.
          </div>
        ) : (
          <>
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
              <label htmlFor="forgot-email">Seu e-mail</label>
              <input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Enviando…' : 'Enviar link'}
            </button>
          </>
        )}

        <p className={styles.formSwitch}>
          <button
            type="button"
            onClick={() => { setError(''); setView('login'); }}
            className={styles.linkButton}
            disabled={isLoading}
          >
            Voltar
          </button>
        </p>
      </form>
    );
  }

  // ── Render: reset ─────────────────────────────────────────────────────────

  if (view === 'reset') {
    return (
      <form onSubmit={handleResetSubmit} className={styles.form}>
        <h2>Redefinir senha</h2>

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
          <div className={styles.labelRow}>
            <label htmlFor="new-password">Nova senha</label>
          </div>
          <div className={styles.passwordWrapper}>
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowNewPassword((v) => !v)}
              aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {showNewPassword ? (
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
          {passwordTooShort && (
            <span className={`${styles.fieldHint} ${styles.fieldHintError}`}>
              Mínimo de 6 caracteres
            </span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirm-password">Confirmar nova senha</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
          {passwordsMismatch && (
            <span className={`${styles.fieldHint} ${styles.fieldHintError}`}>
              As senhas não coincidem
            </span>
          )}
          {passwordsMatch && (
            <span className={`${styles.fieldHint} ${styles.fieldHintOk}`}>
              ✓ Senhas coincidem
            </span>
          )}
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Redefinindo…' : 'Redefinir senha'}
        </button>
      </form>
    );
  }

  // ── Render: login (default) ───────────────────────────────────────────────

  return (
    <form onSubmit={handleLoginSubmit} className={styles.form}>
      <h2>Bem-vindo de volta</h2>

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
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      <div className={styles.formGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="login-password">Senha</label>
          <button
            type="button"
            className={styles.forgotLink}
            onClick={() => { setError(''); setView('forgot'); }}
          >
            Esqueceu?
          </button>
        </div>
        <div className={styles.passwordWrapper}>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            autoComplete="current-password"
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

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Entrando…' : 'Entrar'}
      </button>

      <p className={styles.formSwitch}>
        Não tem conta?{' '}
        <button type="button" onClick={onSwitchToSignup} className={styles.linkButton} disabled={isLoading}>
          Cadastre-se
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
