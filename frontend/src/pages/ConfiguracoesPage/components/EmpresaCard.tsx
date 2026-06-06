import React, { useState, useEffect, useRef } from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { settingsService } from '../../../services/settingsService';

const EmpresaCard: React.FC = () => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsService.getCompany().then((data) => {
      if (!data) return;
      setName(data.name ?? '');
      setCnpj(data.cnpj ?? '');
      setEmail(data.email ?? '');
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
      setLogo(data.logo ?? null);
    });
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await settingsService.upsertCompany({
        name: name || 'Minha Empresa',
        cnpj: cnpj || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        logo: logo || null,
      });
      setMsg({ text: 'Empresa salva com sucesso', ok: true });
    } catch {
      setMsg({ text: 'Erro ao salvar empresa', ok: false });
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🏢 Dados da Empresa</h2>
      <div className={styles.gridTwo}>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Nome / Razão Social</div>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>CNPJ</div>
          <input className={styles.input} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Telefone</div>
          <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>E-mail</div>
          <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Endereço</div>
          <input className={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade - UF, CEP" />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Logo</div>
          <div className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
            {logo ? (
              <img src={logo} alt="Logo" className={styles.logoPreview} />
            ) : (
              '📎 Clique para fazer upload'
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
        </div>
      </div>
      {msg && <p className={msg.ok ? styles.successMsg : styles.errorMsg}>{msg.text}</p>}
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleSave}>Salvar empresa</button>
      </div>
    </div>
  );
};

export default EmpresaCard;
