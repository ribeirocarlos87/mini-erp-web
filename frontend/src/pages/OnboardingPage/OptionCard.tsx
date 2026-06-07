import React from 'react';
import { Check } from 'lucide-react';
import styles from './OptionCard.module.css';

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Quando `true`, mostra checkbox visual (multi-select); quando `false`, indica radio (single). */
  multi?: boolean;
}

/**
 * Card grande clicável usado nas perguntas do onboarding.
 * Funciona tanto como radio (single-select) quanto checkbox (multi-select)
 * — quem controla a lógica é o componente pai.
 */
const OptionCard: React.FC<OptionCardProps> = ({
  label,
  description,
  icon,
  selected,
  onClick,
  disabled,
  multi,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-pressed={selected}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.content}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <span className={`${styles.indicator} ${multi ? styles.checkbox : styles.radio}`}>
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
};

export default OptionCard;
