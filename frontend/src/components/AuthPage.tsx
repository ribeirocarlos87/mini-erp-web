import React, { useState } from 'react';
import LoginForm from '../components/LoginForm/LoginForm';
import SignupForm from './SignupForm/SignupForm';

import styles from './Authpage.module.css';

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab]   = useState<'login' | 'signup'>('login');
  const [resetToken, setResetToken] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') ?? undefined;
  });

  const handleResetSuccess = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setResetToken(undefined);
  };

  return (
    <div className={styles.page}>
      {/* ── LEFT PANEL ── */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="Logo" className={styles.logoImg} />
            <span className={styles.logoText}>MINI ERP WEB</span>
          </div>

          <div className={styles.heroText}>
            <h1>Gerencie seus produtos com precisão.</h1>
            <p>
              Visibilidade total do estoque, pedidos e relatórios —
              tudo em um só lugar.
            </p>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statNum}>Funcionalidades</span>
              <span className={styles.statLabel}>Simplificadas</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>Preço</span>
              <span className={styles.statLabel}>Justo</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>4.9★</span>
              <span className={styles.statLabel}>Avaliação</span>
            </div>
          </div>
        </div>

        {/* decorative blobs */}
        <div className={`${styles.blob} ${styles.blobA}`} />
        <div className={`${styles.blob} ${styles.blobB}`} />
        <div className={`${styles.blob} ${styles.blobC}`} />
        <div className={styles.gridOverlay} />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={styles.formSide}>
        {/* Mobile brand header */}
        <div className={styles.mobileBrand}>
          <img src="/logo.png" alt="Logo" className={styles.logoImg} />
          <span className={styles.logoText}>Mini ERP WEB</span>
        </div>

        <div className={styles.formWrapper}>
          {/* Tab switcher */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'login' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'signup' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('signup')}
              type="button"
            >
              Criar conta
            </button>
            <div
              className={styles.tabIndicator}
              style={{ transform: activeTab === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}
            />
          </div>

          {/* Form area */}
          <div className={styles.formArea}>
            {activeTab === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setActiveTab('signup')}
                resetToken={resetToken}
                onResetSuccess={handleResetSuccess}
              />
            ) : (
              <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
            )}
          </div>
        </div>

        <p className={styles.footerNote}>
          © {new Date().getFullYear()} Mini ERP Web · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
