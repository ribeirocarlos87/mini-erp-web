import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './OnboardingLayout.module.css';

interface OnboardingLayoutProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  saving?: boolean;
  hideBack?: boolean;
  /** Texto opcional logo abaixo do título (passos onde algo precisa ser comunicado). */
  error?: string | null;
  children: React.ReactNode;
}

/**
 * Layout fullscreen do wizard de onboarding.
 *
 * - Sem sidebar (área logada não está liberada ainda).
 * - Header fixo com logo + contador de step.
 * - Progress bar segmentada no topo (1 segmento por step, preenche conforme avança).
 * - Conteúdo centralizado, max-width pra leitura confortável.
 * - Footer fixo com botões "Voltar" e "Continuar".
 *
 * Animação de transição entre steps via framer-motion (fade + slide).
 */
const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  nextLabel = 'Continuar',
  nextDisabled,
  saving,
  hideBack,
  error,
  children,
}) => {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandText}>MINI ERP</span>
        </div>
        <span className={styles.stepCounter}>
          Passo {currentStep + 1} de {totalSteps}
        </span>
      </header>

      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressBar}
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Conteúdo do step */}
      <main className={styles.content}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className={styles.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.body}>{children}</div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer com navegação */}
      <footer className={styles.footer}>
        {!hideBack && onBack ? (
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            disabled={saving}
          >
            <ChevronLeft size={18} />
            Voltar
          </button>
        ) : (
          <span className={styles.spacer} />
        )}

        <button
          type="button"
          className={styles.nextBtn}
          onClick={onNext}
          disabled={nextDisabled || saving}
        >
          {saving ? 'Salvando...' : nextLabel}
          {!saving && <ChevronRight size={18} />}
        </button>
      </footer>
    </div>
  );
};

export default OnboardingLayout;
