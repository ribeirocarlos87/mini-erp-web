import React, { useState, useEffect, useRef } from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { settingsService } from '../../../services/settingsService';

function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function isValidCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(d[i]) * w1[i];
  let rest = sum % 11;
  if (parseInt(d[12]) !== (rest < 2 ? 0 : 11 - rest)) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(d[i]) * w2[i];
  rest = sum % 11;
  if (parseInt(d[13]) !== (rest < 2 ? 0 : 11 - rest)) return false;
  return true;
}

const EmpresaCard: React.FC = () => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsService.getCompany().then((data) => {
      if (!data) return;
      setName(data.name ?? '');
      setCnpj(data.cnpj ? maskCNPJ(data.cnpj) : '');
      setEmail(data.email ?? '');
      setPhone(data.phone ? maskPhone(data.phone) : '');
      setAddress(data.address ?? '');
      setLogo(data.logo ?? null);
    });
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (name.trim().length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres';
    }

    if (cnpj.trim()) {
      if (!isValidCNPJ(cnpj)) {
        newErrors.cnpj = 'CNPJ inválido';
      }
    }

    if (email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'E-mail inválido';
      }
    }

    if (logo && logo.length > 7 * 1024 * 1024) {
      newErrors.logo = 'Logo muito grande. Use uma imagem menor que 5MB.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result.length > 7 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, logo: 'Logo muito grande. Use uma imagem menor que 5MB.' }));
      } else {
        setErrors((prev) => { const n = { ...prev }; delete n.logo; return n; });
        setLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setMsg(null);
    try {
      await settingsService.upsertCompany({
        name: name.trim() || 'Minha Empresa',
        cnpj: cnpj.replace(/\D/g, '') || null,
        email: email.trim() || null,
        phone: phone.replace(/\D/g, '') || null,
        address: address.trim() || null,
        logo: logo || null,
      });
      setMsg({ text: 'Empresa salva com sucesso', ok: true });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.error ||
        'Erro ao salvar empresa';
      setMsg({ text: serverMsg, ok: false });
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🏢 Dados da Empresa</h2>
      <div className={styles.gridTwo}>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Nome / Razão Social</div>
          <input
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
            }}
          />
          {errors.name && <span className={styles.errorText}>{errors.name}</span>}
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>CNPJ</div>
          <input
            className={`${styles.input} ${errors.cnpj ? styles.inputError : ''}`}
            value={cnpj}
            onChange={(e) => {
              setCnpj(maskCNPJ(e.target.value));
              if (errors.cnpj) setErrors((prev) => { const n = { ...prev }; delete n.cnpj; return n; });
            }}
            placeholder="00.000.000/0001-00"
          />
          {errors.cnpj && <span className={styles.errorText}>{errors.cnpj}</span>}
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Telefone</div>
          <input
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            value={phone}
            onChange={(e) => {
              setPhone(maskPhone(e.target.value));
              if (errors.phone) setErrors((prev) => { const n = { ...prev }; delete n.phone; return n; });
            }}
            placeholder="(00) 00000-0000"
          />
          {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>E-mail</div>
          <input
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
            }}
          />
          {errors.email && <span className={styles.errorText}>{errors.email}</span>}
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Endereço</div>
          <input
            className={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, cidade - UF, CEP"
          />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Logo</div>
          <div
            className={`${styles.uploadArea} ${errors.logo ? styles.inputError : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            {logo ? (
              <img src={logo} alt="Logo" className={styles.logoPreview} />
            ) : (
              '📎 Clique para fazer upload'
            )}
          </div>
          {errors.logo && <span className={styles.errorText}>{errors.logo}</span>}
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
