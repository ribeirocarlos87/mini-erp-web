import React from 'react';
import styles from './ConfiguracoesPage.module.css';
import ContaCard from './components/ContaCard';
import EmpresaCard from './components/EmpresaCard';
import AparenciaCard from './components/AparenciaCard';
import NotificacoesCard from './components/NotificacoesCard';

const ConfiguracoesPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Configurações</h1>
        <p>Gerencie suas preferências e dados do sistema</p>
      </div>
      <div className={styles.grid}>
        <ContaCard />
        <EmpresaCard />
        <AparenciaCard />
        <NotificacoesCard />
      </div>
    </div>
  );
};

export default ConfiguracoesPage;
