import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { SidebarProvider } from './context/SidebarContext';
import { useSidebar } from './context/SidebarContext';
import Sidebar from './components/Sidebar';
import AuthPage from './components/AuthPage';
import DashboardPage from './pages/DashboardPage';
import EstoquePage from './pages/EstoquePage';
import PDVPage from './pages/PDVPage';
import SalesAndClientsPage from './pages/SalesAndClientsPage';
import BlankPage from './pages/BlankPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage/ConfiguracoesPage';
import { useSettingsStore } from './store/settingsStore';
import CadastrarClientePage from './pages/CadastrarClientePage';
import ListaClientesPage from './pages/ListaClientesPage';
import VerClientePage from './pages/VerClientePage';
import CriarProdutoPage from './pages/CriarProdutoPage';
import GestaoEstoquePage from './pages/GestaoEstoquePage';
import CategoriasPage from './pages/CategoriasPage';
import MarcasPage from './pages/MarcasPage';
import ColecoesPage from './pages/ColecoesPage';
import FornecedoresPage from './pages/FornecedoresPage';
import RelatoriosPage from './pages/RelatoriosPage';
import VendasReport from './pages/RelatoriosPage/reports/VendasReport';
import ComissoesReport from './pages/RelatoriosPage/reports/ComissoesReport';
import CanaisVendasReport from './pages/RelatoriosPage/reports/CanaisVendasReport';
import CaixasReport from './pages/RelatoriosPage/reports/CaixasReport';
import FormasPagamentoReport from './pages/RelatoriosPage/reports/FormasPagamentoReport';
import DFCReport from './pages/RelatoriosPage/reports/DFCReport';
import DesempenhoProdutoReport from './pages/RelatoriosPage/reports/DesempenhoProdutoReport';
import VendasCategoriasReport from './pages/RelatoriosPage/reports/VendasCategoriasReport';
import InventarioReport from './pages/RelatoriosPage/reports/InventarioReport';
import ClientesReport from './pages/RelatoriosPage/reports/ClientesReport';
import CicloVidaReport from './pages/RelatoriosPage/reports/CicloVidaReport';
import CreditoClientesReport from './pages/RelatoriosPage/reports/CreditoClientesReport';
import FinanceiroPage from './pages/FinanceiroPage';
import LancarDespesaPage from './pages/FinanceiroPage/pages/LancarDespesaPage';
import DespesaRecorrentePage from './pages/FinanceiroPage/pages/DespesaRecorrentePage';
import LancarEntradaPage from './pages/FinanceiroPage/pages/LancarEntradaPage';
import RenegociacaoDividaPage from './pages/FinanceiroPage/pages/RenegociacaoDividaPage';
import LancarDevolucaoPage from './pages/LancarDevolucaoPage';
import OnboardingPage from './pages/OnboardingPage';
import { PDVLayout } from './layouts/PDVLayout';
import WelcomeOverlay from './components/WelcomeOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './App.module.css';

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);

  return isMobile;
};

/**
 * Guard exclusivo do /onboarding — exige user logado mas NÃO redireciona
 * quando onboardingCompletedAt está vazio (justamente onde o wizard atua).
 * Se já completou, manda pro dashboard.
 */
const OnboardingGuard: React.FC<{ children: React.ReactNode; isInitializing: boolean }> = ({
  children,
  isInitializing,
}) => {
  const user = useAuthStore((state) => state.user);
  if (isInitializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#666' }}>
        Carregando...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboardingCompletedAt) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const ProtectedLayout: React.FC<{ children: React.ReactNode; isInitializing: boolean }> = ({
  children,
  isInitializing,
}) => {
  const user = useAuthStore((state) => state.user);
  const justLoggedIn = useAuthStore((state) => state.justLoggedIn);
  const { isOpen, setIsOpen } = useSidebar();
  const isMobile = useIsMobile();
  const [showEntrance, setShowEntrance] = useState(justLoggedIn);

  useEffect(() => {
    if (justLoggedIn) {
      setShowEntrance(true);
      const timer = setTimeout(() => setShowEntrance(false), 2900);
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#666' }}>
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  // Gate de onboarding: enquanto o user não completou, força redirect.
  // Frontend-only gate (não bloqueia API) — onboarding é fluxo de UX.
  if (!user.onboardingCompletedAt) return <Navigate to="/onboarding" replace />;

  return (
    <>
      <WelcomeOverlay />
      <div className={styles.flexLayout}>
        <div className={styles.flexRow}>
          <motion.div
            initial={showEntrance ? { x: -260, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: showEntrance ? 2.2 : 0, duration: 0.5, type: 'spring', stiffness: 120, damping: 18 }}
          >
            <Sidebar />
          </motion.div>

          <motion.main
            className={`${styles.mainContent} ${!isMobile ? (isOpen ? styles.sidebarOpen : '') : ''}`}
            initial={showEntrance ? { opacity: 0, y: 30 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: showEntrance ? 2.4 : 0, duration: 0.6, ease: 'easeOut' }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </>
  );
};

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  const { theme, primaryColor } = useSettingsStore.getState();

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    const darken = (hex: string) => {
      const n = parseInt(hex.replace('#', ''), 16);
      const r = Math.max(0, (n >> 16) - 30);
      const g = Math.max(0, ((n >> 8) & 0xff) - 30);
      const b = Math.max(0, (n & 0xff) - 30);
      return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    };
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-primary-hover', darken(primaryColor));
  }, []);

  return (
    <Router>
      <SidebarProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingGuard isInitializing={isInitializing}><OnboardingPage /></OnboardingGuard>} />
          <Route path="/pdv/*" element={<PDVLayout isInitializing={isInitializing}><PDVPage /></PDVLayout>} />
          <Route path="/dashboard" element={<ProtectedLayout isInitializing={isInitializing}><DashboardPage /></ProtectedLayout>} />
          <Route path="/gestao-estoque" element={<ProtectedLayout isInitializing={isInitializing}><GestaoEstoquePage /></ProtectedLayout>} />
          <Route path="/gestao-estoque/categorias" element={<ProtectedLayout isInitializing={isInitializing}><CategoriasPage /></ProtectedLayout>} />
          <Route path="/gestao-estoque/marcas" element={<ProtectedLayout isInitializing={isInitializing}><MarcasPage /></ProtectedLayout>} />
          <Route path="/gestao-estoque/colecoes" element={<ProtectedLayout isInitializing={isInitializing}><ColecoesPage /></ProtectedLayout>} />
          <Route path="/gestao-estoque/fornecedores" element={<ProtectedLayout isInitializing={isInitializing}><FornecedoresPage /></ProtectedLayout>} />
          <Route path="/estoque"   element={<ProtectedLayout isInitializing={isInitializing}><EstoquePage /></ProtectedLayout>} />
          <Route path="/estoque/criar-produto" element={<ProtectedLayout isInitializing={isInitializing}><CriarProdutoPage /></ProtectedLayout>} />
          <Route path="/estoque/editar-produto/:id" element={<ProtectedLayout isInitializing={isInitializing}><CriarProdutoPage /></ProtectedLayout>} />
          <Route path="/vendas-e-clientes"    element={<ProtectedLayout isInitializing={isInitializing}><SalesAndClientsPage /></ProtectedLayout>} />
          <Route path="/vendas-e-clientes/cadastrar-cliente" element={<ProtectedLayout isInitializing={isInitializing}><CadastrarClientePage /></ProtectedLayout>} />
          <Route path="/vendas-e-clientes/editar-cliente/:id" element={<ProtectedLayout isInitializing={isInitializing}><CadastrarClientePage /></ProtectedLayout>} />
          <Route path="/vendas-e-clientes/ver-cliente/:id" element={<ProtectedLayout isInitializing={isInitializing}><VerClientePage /></ProtectedLayout>} />
          <Route path="/vendas-e-clientes/lista-clientes" element={<ProtectedLayout isInitializing={isInitializing}><ListaClientesPage /></ProtectedLayout>} />
          <Route path="/vendas-e-clientes/lancar-venda" element={<ProtectedLayout isInitializing={isInitializing}><BlankPage title="Lançar Venda" /></ProtectedLayout>} />
          <Route path="/vendas-e-clientes/lancar-devolucao" element={<ProtectedLayout isInitializing={isInitializing}><LancarDevolucaoPage /></ProtectedLayout>} />
          <Route path="/financeiro" element={<ProtectedLayout isInitializing={isInitializing}><FinanceiroPage /></ProtectedLayout>} />
          <Route path="/financeiro/lancar-despesa" element={<ProtectedLayout isInitializing={isInitializing}><LancarDespesaPage /></ProtectedLayout>} />
          <Route path="/financeiro/despesa-recorrente" element={<ProtectedLayout isInitializing={isInitializing}><DespesaRecorrentePage /></ProtectedLayout>} />
          <Route path="/financeiro/lancar-entrada" element={<ProtectedLayout isInitializing={isInitializing}><LancarEntradaPage /></ProtectedLayout>} />
          <Route path="/financeiro/renegociacao-divida" element={<ProtectedLayout isInitializing={isInitializing}><RenegociacaoDividaPage /></ProtectedLayout>} />
          <Route path="/relatorios" element={<ProtectedLayout isInitializing={isInitializing}><RelatoriosPage /></ProtectedLayout>} />
          <Route path="/relatorios/vendas" element={<ProtectedLayout isInitializing={isInitializing}><VendasReport /></ProtectedLayout>} />
          <Route path="/relatorios/comissoes" element={<ProtectedLayout isInitializing={isInitializing}><ComissoesReport /></ProtectedLayout>} />
          <Route path="/relatorios/canais-vendas" element={<ProtectedLayout isInitializing={isInitializing}><CanaisVendasReport /></ProtectedLayout>} />
          <Route path="/relatorios/caixas" element={<ProtectedLayout isInitializing={isInitializing}><CaixasReport /></ProtectedLayout>} />
          <Route path="/relatorios/formas-pagamento" element={<ProtectedLayout isInitializing={isInitializing}><FormasPagamentoReport /></ProtectedLayout>} />
          <Route path="/relatorios/dfc" element={<ProtectedLayout isInitializing={isInitializing}><DFCReport /></ProtectedLayout>} />
          <Route path="/relatorios/desempenho-produto" element={<ProtectedLayout isInitializing={isInitializing}><DesempenhoProdutoReport /></ProtectedLayout>} />
          <Route path="/relatorios/vendas-categorias" element={<ProtectedLayout isInitializing={isInitializing}><VendasCategoriasReport /></ProtectedLayout>} />
          <Route path="/relatorios/inventario" element={<ProtectedLayout isInitializing={isInitializing}><InventarioReport /></ProtectedLayout>} />
          <Route path="/relatorios/clientes" element={<ProtectedLayout isInitializing={isInitializing}><ClientesReport /></ProtectedLayout>} />
          <Route path="/relatorios/ciclo-vida" element={<ProtectedLayout isInitializing={isInitializing}><CicloVidaReport /></ProtectedLayout>} />
          <Route path="/relatorios/credito-clientes" element={<ProtectedLayout isInitializing={isInitializing}><CreditoClientesReport /></ProtectedLayout>} />
          <Route path="/configuracoes" element={<ProtectedLayout isInitializing={isInitializing}><ConfiguracoesPage /></ProtectedLayout>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </SidebarProvider>
    </Router>
  );
}

export default App;