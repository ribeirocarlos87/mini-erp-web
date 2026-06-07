import React, { useState } from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { useAuthStore } from '../../../store/authStore';
import { settingsService } from '../../../services/settingsService';

const ContaCard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSaveProfile = async () => {
    try {
      const updated = await settingsService.updateProfile({ name, email });
      login(updated, token!);
      setProfileMsg({ text: 'Dados salvos com sucesso', ok: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao salvar dados';
      setProfileMsg({ text: msg, ok: false });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'As senhas não coincidem', ok: false });
      return;
    }
    try {
      await settingsService.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ text: 'Senha alterada com sucesso', ok: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao alterar senha';
      setPasswordMsg({ text: msg, ok: false });
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>👤 Minha Conta</h2>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Nome</div>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>E-mail</div>
        <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {profileMsg && (
        <p className={profileMsg.ok ? styles.successMsg : styles.errorMsg}>{profileMsg.text}</p>
      )}
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleSaveProfile}>Salvar dados</button>
      </div>

      <hr className={styles.divider} />
      <p className={styles.sectionLabel}>Segurança</p>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Senha atual</div>
        <input className={styles.input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Nova senha</div>
        <input className={styles.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Confirmar nova senha</div>
        <input className={styles.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      {passwordMsg && (
        <p className={passwordMsg.ok ? styles.successMsg : styles.errorMsg}>{passwordMsg.text}</p>
      )}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={handleChangePassword}>Alterar senha</button>
      </div>
    </div>
  );
};

export default ContaCard;
