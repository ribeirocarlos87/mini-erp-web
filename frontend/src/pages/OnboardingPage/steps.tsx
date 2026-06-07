import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import {
  iconPackage, iconControlKnobs, iconShoppingCart, iconLabel,
  iconDepartmentStore, iconBooks, iconBalanceScale, iconBeatingHeart,
  iconInboxTray, iconMoneyBag, iconSatellite, iconBank, iconBarChart,
  iconChartIncreasing, iconCreditCard, iconMagnifyingGlass, iconTrophy,
  iconPeople,
} from '../../assets/icons';
import OptionCard from './OptionCard';
import styles from './steps.module.css';
import type { OnboardingPatch } from '../../services/onboardingService';

/** Helper: insere ícone 3D (PNG) como ReactNode dentro do OptionCard. */
const ico = (src: string) => <img src={src} alt="" width={32} height={32} />;

/* ═══════════ Componentes reutilizáveis ═══════════ */

interface SingleChoiceProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string; description?: string; icon?: React.ReactNode }>;
  value: T | null | undefined;
  onChange: (value: T) => void;
}

export function SingleChoice<T extends string>({ options, value, onChange }: SingleChoiceProps<T>) {
  return (
    <div className={styles.cardGrid}>
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
    <div className={styles.cardGrid}>
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
      <p className={styles.welcomeMeta}>Responda rapidinho — leva menos de 2 minutos.</p>
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
  // Opt-out é estado puramente local: o checkbox SEMPRE começa desmarcado,
  // mesmo quando state.cnpj é null. "null no DB" pode significar tanto "nunca
  // preencheu" quanto "opted out" — não dá pra derivar com segurança. User
  // marca manualmente se não tiver CNPJ.
  const [optOut, setOptOut] = useState(false);

  const display = !optOut && value && value.length > 0 ? maskCnpj(value) : '';

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
    if (optOut) setOptOut(false);
    onChange(digits);
  };

  const handleToggleOptOut = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setOptOut(checked);
    onChange(checked ? null : '');
  };

  return (
    <div className={styles.formBlock}>
      <input
        type="text"
        className={styles.textInput}
        placeholder="00.000.000/0000-00"
        value={display}
        disabled={optOut}
        onChange={handleTextChange}
        maxLength={18}
        inputMode="numeric"
        autoFocus
      />
      <label className={styles.optOut}>
        <input type="checkbox" checked={optOut} onChange={handleToggleOptOut} />
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
        <Phone size={18} />
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

/* ═══════════ Opções com ícones 3D ═══════════ */

export const BUSINESS_TYPE_OPTIONS = [
  { value: 'produtos', label: 'Produtos', description: 'Vendo produtos físicos ou digitais.', icon: ico(iconPackage) },
  { value: 'servicos', label: 'Serviços', description: 'Presto serviços (manutenção, beleza, consultoria).', icon: ico(iconControlKnobs) },
  { value: 'ambos', label: 'Produtos e Serviços', description: 'Vendo os dois — produtos e serviços.', icon: ico(iconShoppingCart) },
] as const;

export const SEGMENT_OPTIONS = [
  { value: 'moda', label: 'Moda, Beleza e Esportes', icon: ico(iconLabel) },
  { value: 'casa', label: 'Móveis, Casa e Decoração', icon: ico(iconDepartmentStore) },
  { value: 'alimentacao', label: 'Alimentação e Bebidas', icon: ico(iconShoppingCart) },
  { value: 'eletronicos', label: 'Eletrônicos e Automotivos', icon: ico(iconControlKnobs) },
  { value: 'papelaria', label: 'Papelaria, Brinquedos e Bazares', icon: ico(iconBooks) },
  { value: 'construcao', label: 'Construção e Ferramentas', icon: ico(iconBalanceScale) },
  { value: 'pet', label: 'Pet Shops e Agropecuárias', icon: ico(iconBeatingHeart) },
  { value: 'servicos', label: 'Prestador de Serviços', icon: ico(iconControlKnobs) },
  { value: 'industria', label: 'Pequena Indústria', icon: ico(iconInboxTray) },
  { value: 'bar', label: 'Bar e Restaurante', icon: ico(iconMoneyBag) },
] as const;

export const TAX_REGIME_OPTIONS = [
  { value: 'MEI', label: 'MEI', description: 'Faturamento até R$ 6.750 mensais.' },
  { value: 'SIMPLES', label: 'Simples Nacional', description: 'Faturamento até R$ 400 mil mensais.' },
  { value: 'PRESUMIDO', label: 'Lucro Presumido', description: 'Para empresas de médio porte.' },
  { value: 'REAL', label: 'Lucro Real', description: 'Apuração detalhada de lucros e custos.' },
  { value: 'SEM_EMPRESA', label: 'Ainda não tenho empresa formalizada', description: 'Tudo bem — você pode formalizar depois.' },
] as const;

export const MULTI_STORE_OPTIONS = [
  { value: 'unica', label: 'Apenas uma loja', description: 'Operação centralizada em um único ponto.', icon: ico(iconDepartmentStore) },
  { value: 'integrada', label: 'Várias lojas, gestão integrada', description: 'Múltiplas lojas com estoque e relatórios consolidados.', icon: ico(iconSatellite) },
  { value: 'independente', label: 'Várias lojas, gestão independente', description: 'Lojas separadas com gestão própria.', icon: ico(iconControlKnobs) },
] as const;

export const SALES_CHANNEL_OPTIONS = [
  { value: 'fisica', label: 'Loja física', icon: ico(iconDepartmentStore) },
  { value: 'whatsapp', label: 'WhatsApp', icon: ico(iconPeople) },
  { value: 'instagram', label: 'Instagram', icon: ico(iconSatellite) },
  { value: 'tiktok', label: 'TikTok', icon: ico(iconSatellite) },
  { value: 'ecommerce', label: 'E-commerce próprio', icon: ico(iconShoppingCart) },
  { value: 'marketplace', label: 'Marketplace', icon: ico(iconBarChart) },
  { value: 'outras_redes', label: 'Outras redes sociais', icon: ico(iconPeople) },
] as const;

export const HEARD_ABOUT_OPTIONS = [
  { value: 'indicacao', label: 'Indicação', icon: ico(iconPeople) },
  { value: 'instagram', label: 'Instagram', icon: ico(iconSatellite) },
  { value: 'whatsapp', label: 'WhatsApp', icon: ico(iconPeople) },
  { value: 'google', label: 'Google / Bing', icon: ico(iconMagnifyingGlass) },
  { value: 'evento', label: 'Evento ou palestra', icon: ico(iconTrophy) },
  { value: 'redes_sociais', label: 'Outras redes sociais', icon: ico(iconSatellite) },
  { value: 'site', label: 'Li em algum site', icon: ico(iconChartIncreasing) },
  { value: 'blog', label: 'Blog do MINI ERP', icon: ico(iconBooks) },
  { value: 'outro', label: 'Outro', icon: ico(iconLabel) },
] as const;

export const CURRENT_CONTROL_OPTIONS = [
  { value: 'cabeca', label: 'Na minha cabeça', description: 'Sem registro formal.', icon: ico(iconBeatingHeart) },
  { value: 'caderno', label: 'Caderno / anotações', description: 'Anotações manuais.', icon: ico(iconBooks) },
  { value: 'planilha', label: 'Planilha', description: 'Excel, Google Sheets.', icon: ico(iconChartIncreasing) },
  { value: 'erp', label: 'Sistema de gestão', description: 'Já uso um ERP.', icon: ico(iconControlKnobs) },
] as const;

export const IMPROVEMENT_GOALS_OPTIONS = [
  { value: 'financeiro', label: 'Organizar o financeiro', icon: ico(iconMoneyBag) },
  { value: 'estoque', label: 'Controlar o estoque', icon: ico(iconPackage) },
  { value: 'vender_mais', label: 'Vender mais', icon: ico(iconChartIncreasing) },
  { value: 'integracao', label: 'Integrar canais', icon: ico(iconSatellite) },
  { value: 'profissionalizar', label: 'Profissionalizar a operação', icon: ico(iconTrophy) },
  { value: 'numeros', label: 'Entender meus números', icon: ico(iconBarChart) },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: 'pdv_dedicado', label: 'PC/Notebook/Tablet PDV', icon: ico(iconControlKnobs) },
  { value: 'impressora_termica', label: 'Impressora térmica', icon: ico(iconLabel) },
  { value: 'impressora_comum', label: 'Impressora comum', icon: ico(iconLabel) },
  { value: 'leitor_barras', label: 'Leitor de código de barras', icon: ico(iconMagnifyingGlass) },
  { value: 'gaveta', label: 'Gaveta de dinheiro', icon: ico(iconMoneyBag) },
  { value: 'balanca', label: 'Balança', icon: ico(iconBalanceScale) },
  { value: 'maquininha', label: 'Maquininha de cartão', icon: ico(iconCreditCard) },
  { value: 'so_celular', label: 'Só celular / tablet', icon: ico(iconPeople) },
  { value: 'nenhum', label: 'Ainda não defini', icon: ico(iconLabel) },
] as const;

export const LEARNING_PREFS_OPTIONS = [
  { value: 'nao_estudo', label: 'Não costumo estudar', icon: ico(iconLabel) },
  { value: 'youtube', label: 'YouTube', icon: ico(iconSatellite) },
  { value: 'instagram', label: 'Instagram', icon: ico(iconSatellite) },
  { value: 'tiktok', label: 'TikTok', icon: ico(iconSatellite) },
  { value: 'eventos', label: 'Eventos e palestras', icon: ico(iconTrophy) },
  { value: 'sebrae', label: 'Sebrae', icon: ico(iconBank) },
  { value: 'cursos', label: 'Cursos / mentorias', icon: ico(iconBooks) },
  { value: 'podcasts', label: 'Podcasts', icon: ico(iconSatellite) },
  { value: 'indicacao', label: 'Indicações', icon: ico(iconPeople) },
  { value: 'outros', label: 'Outros', icon: ico(iconLabel) },
] as const;

export const TECH_LEVEL_OPTIONS = [
  { value: 'basico', label: 'Só uso o básico e o que é obrigatório' },
  { value: 'necessario', label: 'Uso o necessário, sem complicação' },
  { value: 'curioso', label: 'Gosto de aprender e testar quando vejo valor' },
  { value: 'entusiasta', label: 'Sou entusiasta e gosto de explorar' },
] as const;

export const TUTORIAL_PREF_OPTIONS = [
  { value: 'video', label: 'Ver um vídeo curto', icon: ico(iconChartIncreasing) },
  { value: 'passo_a_passo', label: 'Ler um passo a passo', icon: ico(iconBooks) },
  { value: 'tour', label: 'Fazer um tour guiado', icon: ico(iconMagnifyingGlass) },
  { value: 'explorar', label: 'Explorar sozinho', icon: ico(iconControlKnobs) },
] as const;

/* ═══════════ Configuração dos 15 steps ═══════════ */

export type StepType = 'welcome' | 'cnpj' | 'whatsapp' | 'single' | 'multi';

export interface StepConfig {
  id: string;
  type: StepType;
  title: string;
  subtitle?: string;
  field?: keyof OnboardingPatch;
  options?: ReadonlyArray<{ value: string; label: string; description?: string; icon?: React.ReactNode }>;
  required?: boolean;
}

export const STEP_CONFIGS: StepConfig[] = [
  { id: 'welcome', type: 'welcome', title: 'Bem-vindo ao MINI ERP' },
  {
    id: 'cnpj',
    type: 'cnpj',
    title: 'Qual o CNPJ da sua empresa?',
    subtitle: 'Opcional — se preencher, aceleramos suas configurações fiscais. Sem CNPJ? Marque a opção abaixo.',
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
