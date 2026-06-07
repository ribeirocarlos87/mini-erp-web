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
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const validateProfile = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Nome é obrigatório';
    } else if (name.trim().length > 100) {
      errs.name = 'Nome deve ter no máximo 100 caracteres';
    }
    if (!email.trim()) {
      errs.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'E-mail inválido';
    }
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePassword = (): boolean => {
    const errs: Record<string, string> = {};
    if (!currentPassword) {
      errs.currentPassword = 'Informe a senha atual';
    }
    if (!newPassword) {
      errs.newPassword = 'Informe a nova senha';
    } else if (newPassword.length < 6) {
      errs.newPassword = 'A nova senha deve ter pelo menos 6 caracteres';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Confirme a nova senha';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'As senhas não coincidem';
    }
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    setProfileMsg(null);
    try {
      const updated = await settingsService.updateProfile({ name: name.trim(), email: email.trim() });
      login(updated, token!);
      setProfileMsg({ text: 'Dados salvos com sucesso', ok: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.error ||
        'Erro ao salvar dados';
      setProfileMsg({ text: msg, ok: false });
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    setPasswordMsg(null);
    try {
      await settingsService.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
      setPasswordMsg({ text: 'Senha alterada com sucesso', ok: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.error ||
        'Erro ao alterar senha';
      setPasswordMsg({ text: msg, ok: false });
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>👤 Minha Conta</h2>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Nome</div>
        <input
          className={`${styles.input} ${profileErrors.name ? styles.inputError : ''}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (profileErrors.name) setProfileErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
          }}
        />
        {profileErrors.name && <span className={styles.errorText}>{profileErrors.name}</span>}
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>E-mail</div>
        <input
          className={`${styles.input} ${profileErrors.email ? styles.inputError : ''}`}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (profileErrors.email) setProfileErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
          }}
        />
        {profileErrors.email && <span className={styles.errorText}>{profileErrors.email}</span>}
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
        <input
          className={`${styles.input} ${passwordErrors.currentPassword ? styles.inputError : ''}`}
          type="password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            if (passwordErrors.currentPassword) setPasswordErrors((prev) => { const n = { ...prev }; delete n.currentPassword; return n; });
          }}
        />
        {passwordErrors.currentPassword && <span className={styles.errorText}>{passwordErrors.currentPassword}</span>}
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Nova senha</div>
        <input
          className={`${styles.input} ${passwordErrors.newPassword ? styles.inputError : ''}`}
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (passwordErrors.newPassword) setPasswordErrors((prev) => { const n = { ...prev }; delete n.newPassword; return n; });
          }}
        />
        {passwordErrors.newPassword && <span className={styles.errorText}>{passwordErrors.newPassword}</span>}
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Confirmar nova senha</div>
        <input
          className={`${styles.input} ${passwordErrors.confirmPassword ? styles.inputError : ''}`}
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (passwordErrors.confirmPassword) setPasswordErrors((prev) => { const n = { ...prev }; delete n.confirmPassword; return n; });
          }}
        />
        {passwordErrors.confirmPassword && <span className={styles.errorText}>{passwordErrors.confirmPassword}</span>}
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
