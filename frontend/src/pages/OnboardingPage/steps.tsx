import React from 'react';
import {
  Package, Wrench, ShoppingBag, Home, UtensilsCrossed, Cpu, Pencil,
  Hammer, Dog, Briefcase, Factory, Beer, FileText, Store, Link2,
  Smartphone, Building2, BookOpen, Calculator, Laptop,
  TrendingUp, Eye, BarChart3, Brain, MessageSquare,
  Instagram, Search, CalendarDays, Globe, Share2, ScanLine,
  Coins, Scale, MoreHorizontal, Printer, ShoppingCart, Phone,
  Youtube, Music2, GraduationCap, Headphones, Users, PlayCircle,
  ListChecks, Compass, MousePointer2,
} from 'lucide-react';
import OptionCard from './OptionCard';
import styles from './steps.module.css';
import type { OnboardingPatch, OnboardingState } from '../../services/onboardingService';

/* ═══════════ Componentes reutilizáveis ═══════════ */

interface SingleChoiceProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string; description?: string; icon?: React.ReactNode }>;
  value: T | null | undefined;
  onChange: (value: T) => void;
}

export function SingleChoice<T extends string>({ options, value, onChange }: SingleChoiceProps<T>) {
  return (
    <div className={styles.cardList}>
      {options.map((opt) => (
        <OptionCard
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          description={opt.description}
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}

interface MultiChoiceProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string; description?: string; icon?: React.ReactNode }>;
  values: T[] | undefined;
  onToggle: (value: T) => void;
}

export function MultiChoice<T extends string>({ options, values, onToggle }: MultiChoiceProps<T>) {
  const selected = values ?? [];
  return (
    <div className={styles.cardList}>
      {options.map((opt) => (
        <OptionCard
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          description={opt.description}
          multi
          selected={selected.includes(opt.value)}
          onClick={() => onToggle(opt.value)}
        />
      ))}
    </div>
  );
}

/* ═══════════ Welcome ═══════════ */

export const Welcome: React.FC<{ name: string }> = ({ name }) => {
  const firstName = name.split(' ')[0] || 'Lojista';
  return (
    <div className={styles.welcomeBox}>
      <div className={styles.welcomeEmoji}>🎉</div>
      <h2 className={styles.welcomeGreeting}>Olá, {firstName}!</h2>
      <p className={styles.welcomeBody}>
        É ótimo ter você a bordo. Vamos deixar o MINI ERP perfeito para o seu tipo de loja.
      </p>
      <p className={styles.welcomeMeta}>
        Responda rapidinho — leva menos de 2 minutos.
      </p>
      <p className={styles.welcomeFootnote}>
        Usaremos suas respostas para personalizar sua experiência, liberar atalhos importantes
        e montar seu ambiente do jeito certo desde o primeiro acesso.
      </p>
    </div>
  );
};

/* ═══════════ CNPJ ═══════════ */

function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

interface CnpjStepProps {
  value: string | null | undefined;
  onChange: (digits: string | null) => void;
}

export const CnpjStep: React.FC<CnpjStepProps> = ({ value, onChange }) => {
  const optOut = value === null;
  const display = value && value.length > 0 ? maskCnpj(value) : '';
  return (
    <div className={styles.formBlock}>
      <input
        type="text"
        className={styles.textInput}
        placeholder="00.000.000/0000-00"
        value={display}
        disabled={optOut}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 14) || '')}
        maxLength={18}
        inputMode="numeric"
        autoFocus
      />
      <label className={styles.optOut}>
        <input
          type="checkbox"
          checked={optOut}
          onChange={(e) => onChange(e.target.checked ? null : '')}
        />
        Ainda não possuo CNPJ formalizado
      </label>
    </div>
  );
};

/* ═══════════ WhatsApp ═══════════ */

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`));
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`));
}

interface WhatsappStepProps {
  value: string | null | undefined;
  onChange: (digits: string) => void;
}

export const WhatsappStep: React.FC<WhatsappStepProps> = ({ value, onChange }) => {
  const digits = value ?? '';
  const display = digits ? maskPhone(digits) : '';
  return (
    <div className={styles.formBlock}>
      <div className={styles.contactBadge}>
        <Phone size={24} />
        <span>Suporte rápido durante seu período inicial</span>
      </div>
      <input
        id="onboarding-whatsapp"
        type="tel"
        className={styles.textInput}
        placeholder="(11) 99999-8888"
        value={display}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
        autoComplete="tel"
        inputMode="numeric"
        autoFocus
      />
      <p className={styles.formHint}>
        Não enviamos spam. Você pode pedir para parar a qualquer momento.
      </p>
    </div>
  );
};

/* ═══════════ Opções (15 step configs) ═══════════ */

export const BUSINESS_TYPE_OPTIONS = [
  { value: 'produtos', label: 'Produtos', description: 'Vendo produtos físicos ou digitais.', icon: <Package size={20} /> },
  { value: 'servicos', label: 'Serviços', description: 'Presto serviços (manutenção, beleza, consultoria, etc).', icon: <Wrench size={20} /> },
  { value: 'ambos', label: 'Produtos e Serviços', description: 'Vendo os dois — produtos e serviços.', icon: <ShoppingBag size={20} /> },
] as const;

export const SEGMENT_OPTIONS = [
  { value: 'moda', label: 'Moda, Beleza e Esportes', icon: <ShoppingBag size={20} /> },
  { value: 'casa', label: 'Móveis, Casa e Decoração', icon: <Home size={20} /> },
  { value: 'alimentacao', label: 'Alimentação, Suplementos e Bebidas', icon: <UtensilsCrossed size={20} /> },
  { value: 'eletronicos', label: 'Eletrônicos, Eletrodomésticos e Automotivos', icon: <Cpu size={20} /> },
  { value: 'papelaria', label: 'Papelarias, Brinquedos e Bazares', icon: <Pencil size={20} /> },
  { value: 'construcao', label: 'Materiais de Construção, Ferragens e Ferramentas', icon: <Hammer size={20} /> },
  { value: 'pet', label: 'Pet Shops, Agropecuárias e Plantas', icon: <Dog size={20} /> },
  { value: 'servicos', label: 'Prestador de Serviços', icon: <Briefcase size={20} /> },
  { value: 'industria', label: 'Pequena Indústria', icon: <Factory size={20} /> },
  { value: 'bar', label: 'Bar e Restaurante', icon: <Beer size={20} /> },
] as const;

export const TAX_REGIME_OPTIONS = [
  { value: 'MEI', label: 'MEI', description: 'Faturamento até R$ 6.750 mensais.' },
  { value: 'SIMPLES', label: 'Simples Nacional', description: 'Faturamento até R$ 400 mil mensais.' },
  { value: 'PRESUMIDO', label: 'Lucro Presumido', description: 'Para empresas de médio porte.' },
  { value: 'REAL', label: 'Lucro Real', description: 'Apuração detalhada de lucros e custos.' },
  { value: 'SEM_EMPRESA', label: 'Ainda não tenho empresa formalizada', description: 'Tudo bem — você pode formalizar depois.' },
] as const;

export const MULTI_STORE_OPTIONS = [
  { value: 'unica', label: 'Não, tenho apenas uma loja', description: 'Operação centralizada em um único ponto.' },
  { value: 'integrada', label: 'Sim, e preciso de gestão integrada', description: 'Múltiplas lojas com estoque e relatórios consolidados.' },
  { value: 'independente', label: 'Sim, mas cada loja tem gestão independente', description: 'Lojas separadas com gestão própria.' },
] as const;

export const SALES_CHANNEL_OPTIONS = [
  { value: 'fisica', label: 'Loja física', icon: <Store size={20} /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={20} /> },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={20} /> },
  { value: 'tiktok', label: 'TikTok', icon: <Music2 size={20} /> },
  { value: 'ecommerce', label: 'E-commerce próprio', icon: <Globe size={20} /> },
  { value: 'marketplace', label: 'Marketplace', icon: <Link2 size={20} /> },
  { value: 'outras_redes', label: 'Outras redes sociais', icon: <Share2 size={20} /> },
] as const;

export const HEARD_ABOUT_OPTIONS = [
  { value: 'indicacao', label: 'Indicação de alguém', icon: <Users size={20} /> },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={20} /> },
  { value: 'whatsapp', label: 'Contato pelo WhatsApp', icon: <MessageSquare size={20} /> },
  { value: 'google', label: 'Buscas no Google / Bing', icon: <Search size={20} /> },
  { value: 'evento', label: 'Evento ou palestra', icon: <CalendarDays size={20} /> },
  { value: 'redes_sociais', label: 'Outras redes sociais', icon: <Share2 size={20} /> },
  { value: 'site', label: 'Li em algum site', icon: <Globe size={20} /> },
  { value: 'blog', label: 'Blog do MINI ERP', icon: <FileText size={20} /> },
  { value: 'outro', label: 'Outro', icon: <MoreHorizontal size={20} /> },
] as const;

export const CURRENT_CONTROL_OPTIONS = [
  { value: 'cabeca', label: 'Na minha cabeça', description: 'Sem registro formal.', icon: <Brain size={20} /> },
  { value: 'caderno', label: 'Caderno / anotações', description: 'Anotações manuais em papel.', icon: <BookOpen size={20} /> },
  { value: 'planilha', label: 'Planilha', description: 'Excel, Google Sheets, etc.', icon: <Calculator size={20} /> },
  { value: 'erp', label: 'Sistema de gestão (ERP)', description: 'Já uso um sistema dedicado.', icon: <Laptop size={20} /> },
] as const;

export const IMPROVEMENT_GOALS_OPTIONS = [
  { value: 'financeiro', label: 'Organizar o financeiro', icon: <Calculator size={20} /> },
  { value: 'estoque', label: 'Controlar melhor o estoque', icon: <Package size={20} /> },
  { value: 'vender_mais', label: 'Vender mais para os clientes que já tenho', icon: <TrendingUp size={20} /> },
  { value: 'integracao', label: 'Integrar loja física e canais digitais', icon: <Link2 size={20} /> },
  { value: 'profissionalizar', label: 'Profissionalizar a operação', icon: <Briefcase size={20} /> },
  { value: 'numeros', label: 'Entender melhor meus números', icon: <BarChart3 size={20} /> },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: 'pdv_dedicado', label: 'PC/Notebook/Tablet dedicado ao PDV', icon: <Laptop size={20} /> },
  { value: 'impressora_termica', label: 'Impressora térmica', icon: <Printer size={20} /> },
  { value: 'impressora_comum', label: 'Impressora comum', icon: <Printer size={20} /> },
  { value: 'leitor_barras', label: 'Leitor de código de barras', icon: <ScanLine size={20} /> },
  { value: 'gaveta', label: 'Gaveta de dinheiro', icon: <Coins size={20} /> },
  { value: 'balanca', label: 'Balança', icon: <Scale size={20} /> },
  { value: 'maquininha', label: 'Maquininha de cartão', icon: <ShoppingCart size={20} /> },
  { value: 'so_celular', label: 'Uso só celular / tablet', icon: <Smartphone size={20} /> },
  { value: 'nenhum', label: 'Ainda não tenho equipamentos definidos', icon: <FileText size={20} /> },
] as const;

export const LEARNING_PREFS_OPTIONS = [
  { value: 'nao_estudo', label: 'Não costumo estudar', icon: <Eye size={20} /> },
  { value: 'youtube', label: 'YouTube', icon: <Youtube size={20} /> },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={20} /> },
  { value: 'tiktok', label: 'TikTok', icon: <Music2 size={20} /> },
  { value: 'eventos', label: 'Palestras e eventos', icon: <CalendarDays size={20} /> },
  { value: 'sebrae', label: 'Sebrae', icon: <Building2 size={20} /> },
  { value: 'cursos', label: 'Cursos online / mentorias', icon: <GraduationCap size={20} /> },
  { value: 'podcasts', label: 'Podcasts', icon: <Headphones size={20} /> },
  { value: 'indicacao', label: 'Indicação de outros lojistas', icon: <Users size={20} /> },
  { value: 'outros', label: 'Outros', icon: <BookOpen size={20} /> },
] as const;

export const TECH_LEVEL_OPTIONS = [
  { value: 'basico', label: 'Só uso o básico e o que é obrigatório' },
  { value: 'necessario', label: 'Uso o necessário, sem gostar muito de complicação' },
  { value: 'curioso', label: 'Gosto de aprender e testar quando vejo valor' },
  { value: 'entusiasta', label: 'Sou entusiasta e gosto de explorar' },
] as const;

export const TUTORIAL_PREF_OPTIONS = [
  { value: 'video', label: 'Ver um vídeo curto', icon: <PlayCircle size={20} /> },
  { value: 'passo_a_passo', label: 'Ler um passo a passo', icon: <ListChecks size={20} /> },
  { value: 'tour', label: 'Fazer um tour guiado', icon: <Compass size={20} /> },
  { value: 'explorar', label: 'Explorar sozinho', icon: <MousePointer2 size={20} /> },
] as const;

/* ═══════════ Configuração de cada step ═══════════ */

export type StepType = 'welcome' | 'cnpj' | 'whatsapp' | 'single' | 'multi';

export interface StepConfig {
  id: string;
  type: StepType;
  title: string;
  subtitle?: string;
  /** Campo do OnboardingPatch que esse step preenche (não usado em welcome/cnpj/whatsapp). */
  field?: keyof OnboardingPatch;
  options?: ReadonlyArray<{ value: string; label: string; description?: string; icon?: React.ReactNode }>;
  /** Se true, exige seleção/preenchimento antes de avançar. */
  required?: boolean;
}

export const STEP_CONFIGS: StepConfig[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Bem-vindo ao MINI ERP',
  },
  {
    id: 'cnpj',
    type: 'cnpj',
    title: 'Qual o CNPJ da sua empresa?',
    subtitle: 'Opcional — se preencher, aceleramos suas configurações fiscais. Sem CNPJ? Marque a opção abaixo e siga em frente.',
  },
  {
    id: 'businessType',
    type: 'single',
    field: 'businessType',
    title: 'O que sua empresa vende hoje?',
    subtitle: 'Isso libera as funções certas desde o primeiro acesso.',
    options: BUSINESS_TYPE_OPTIONS,
    required: true,
  },
  {
    id: 'segment',
    type: 'single',
    field: 'segment',
    title: 'Qual segmento representa sua loja?',
    subtitle: 'Escolha o mais próximo — cada um tem particularidades.',
    options: SEGMENT_OPTIONS,
    required: true,
  },
  {
    id: 'taxRegime',
    type: 'single',
    field: 'taxRegime',
    title: 'Qual o regime tributário da sua empresa?',
    subtitle: 'Isso ajuda a orientar suas rotinas fiscais. Sem empresa? Sem problemas.',
    options: TAX_REGIME_OPTIONS,
    required: true,
  },
  {
    id: 'multiStore',
    type: 'single',
    field: 'multiStore',
    title: 'Hoje você opera mais de uma loja?',
    subtitle: 'Impacta diretamente como organizamos estoque e relatórios.',
    options: MULTI_STORE_OPTIONS,
    required: true,
  },
  {
    id: 'salesChannels',
    type: 'multi',
    field: 'salesChannels',
    title: 'Em quais canais você vende hoje?',
    subtitle: 'Pode marcar mais de um — vamos ativar os módulos certos.',
    options: SALES_CHANNEL_OPTIONS,
    required: true,
  },
  {
    id: 'heardAbout',
    type: 'single',
    field: 'heardAbout',
    title: 'Como você conheceu o MINI ERP?',
    subtitle: 'Nos ajuda a entender o que funciona melhor para chegar até você.',
    options: HEARD_ABOUT_OPTIONS,
  },
  {
    id: 'currentControl',
    type: 'single',
    field: 'currentControl',
    title: 'Como você controla sua loja hoje?',
    subtitle: 'Não importa o ponto de partida — adaptamos a explicação a você.',
    options: CURRENT_CONTROL_OPTIONS,
    required: true,
  },
  {
    id: 'improvementGoals',
    type: 'multi',
    field: 'improvementGoals',
    title: 'O que você mais quer melhorar nos próximos meses?',
    subtitle: 'Pode marcar mais de um. Montamos sua trilha personalizada.',
    options: IMPROVEMENT_GOALS_OPTIONS,
    required: true,
  },
  {
    id: 'equipment',
    type: 'multi',
    field: 'equipment',
    title: 'Quais equipamentos você usa?',
    subtitle: 'Pode marcar mais de um. Configuramos o sistema de acordo.',
    options: EQUIPMENT_OPTIONS,
  },
  {
    id: 'learningPrefs',
    type: 'multi',
    field: 'learningPrefs',
    title: 'Como você costuma aprender?',
    subtitle: 'Pode marcar mais de um. Vamos enviar conteúdos certeiros.',
    options: LEARNING_PREFS_OPTIONS,
  },
  {
    id: 'techLevel',
    type: 'single',
    field: 'techLevel',
    title: 'Qual seu nível de experiência com tecnologia?',
    subtitle: 'Vamos ajustar o ritmo da sua jornada conforme sua resposta.',
    options: TECH_LEVEL_OPTIONS,
    required: true,
  },
  {
    id: 'tutorialPref',
    type: 'single',
    field: 'tutorialPref',
    title: 'Como prefere aprender sobre o sistema?',
    subtitle: 'Vamos guiar seu primeiro acesso do jeito que faz mais sentido para você.',
    options: TUTORIAL_PREF_OPTIONS,
    required: true,
  },
  {
    id: 'whatsapp',
    type: 'whatsapp',
    title: 'Quase lá! Qual seu WhatsApp?',
    subtitle: 'Receba orientações, dicas de uso e suporte rápido durante seu período inicial.',
  },
];

export const TOTAL_STEPS = STEP_CONFIGS.length;
