import React from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { useSettingsStore } from '../../../store/settingsStore';

const NotificacoesCard: React.FC = () => {
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotification = useSettingsStore((s) => s.setNotification);

  const Toggle: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
    <button
      className={`${styles.toggle} ${on ? styles.toggleOn : styles.toggleOff}`}
      onClick={onToggle}
      aria-pressed={on}
    >
      <span className={`${styles.toggleKnob} ${on ? styles.toggleKnobOn : styles.toggleKnobOff}`} />
    </button>
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🔔 Notificações</h2>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>Estoque Baixo</h4>
          <p>Alertar quando produto atingir estoque mínimo</p>
        </div>
        <Toggle
          on={notifications.lowStock}
          onToggle={() => setNotification('lowStock', !notifications.lowStock)}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>Devoluções</h4>
          <p>Alerta quando uma devolução for registrada</p>
        </div>
        <Toggle
          on={notifications.returns}
          onToggle={() => setNotification('returns', !notifications.returns)}
        />
      </div>

      <p className={styles.hint}>As preferências de notificação são salvas automaticamente.</p>
    </div>
  );
};

export default NotificacoesCard;
