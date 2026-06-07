import React from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { useSettingsStore } from '../../../store/settingsStore';

function darken(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 30);
  const b = Math.max(0, (n & 0xff) - 30);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
];

const AparenciaCard: React.FC = () => {
  const theme = useSettingsStore((s) => s.theme);
  const primaryColor = useSettingsStore((s) => s.primaryColor);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setPrimaryColor = useSettingsStore((s) => s.setPrimaryColor);

  const handleTheme = (t: 'light' | 'dark') => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const handleColor = (color: string) => {
    setPrimaryColor(color);
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', darken(color));
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🎨 Aparência</h2>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>Tema</h4>
          <p>Claro ou escuro</p>
        </div>
        <div className={styles.themeButtons}>
          <button
            className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : styles.themeBtnInactive}`}
            onClick={() => handleTheme('light')}
          >
            ☀ Claro
          </button>
          <button
            className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : styles.themeBtnInactive}`}
            onClick={() => handleTheme('dark')}
          >
            🌙 Escuro
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>Idioma</h4>
          <p>Idioma da interface</p>
        </div>
        <span style={{ fontSize: 13 }}>🇧🇷 Português (BR)</span>
      </div>

      <div style={{ marginTop: 8 }}>
        <div className={styles.fieldLabel}>Cor principal</div>
        <div className={styles.colorPalette}>
          {COLORS.map((c) => (
            <button
              key={c}
              className={`${styles.colorSwatch} ${primaryColor === c ? styles.colorSwatchActive : ''}`}
              style={{ background: c }}
              onClick={() => handleColor(c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <p className={styles.hint}>As preferências de aparência são salvas automaticamente.</p>
    </div>
  );
};

export default AparenciaCard;
