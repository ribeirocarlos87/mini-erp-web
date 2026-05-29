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

interface StepProps {
  draft: OnboardingPatch;
  state: OnboardingState;
  patch: (changes: Partial<OnboardingPatch>) => void;
}

/* ═══════════ STEP 1 — Boas-vindas ═══════════ */

export const StepWelcome: React.FC<{ name: string }> = ({ name }) => {
  const firstName = name.split(' ')[0] || 'Lojista';
  return (
    <div className={styles.welcomeBox}>
      <div className={styles.welcomeEmoji}>🎉</div>
      <h2 className={styles.welcomeGreeting}>Olá, {firstName}!</h2>
      <p className={styles.welcomeBody}>
        É ótimo ter você a bordo. Vamos deixar o MINI ERP perfeito para o seu tipo de loja.
      </p>
      <p className={styles.welcomeMeta}>
        Responda rapidinho — leva menos de 1 minuto.
      </p>
      <p className={styles.welcomeFootnote}>
        Usaremos suas respostas para personalizar sua experiência, liberar atalhos importantes
        e montar seu ambiente do jeito certo desde o primeiro acesso.
      </p>
    </div>
  );
};

/* ═══════════ STEP 2 — Sua empresa ═══════════ */

const BUSINESS_TYPE_OPTIONS = [
  { value: 'produtos', label: 'Produtos', desc: 'Vendo produtos físicos ou digitais.', icon: <Package size={20} /> },
  { value: 'servicos', label: 'Serviços', desc: 'Presto serviços (manutenção, beleza, consultoria, etc).', icon: <Wrench size={20} /> },
  { value: 'ambos', label: 'Produtos e Serviços', desc: 'Vendo os dois — produtos e serviços.', icon: <ShoppingBag size={20} /> },
] as const;

const SEGMENT_OPTIONS = [
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

const TAX_REGIME_OPTIONS = [
  { value: 'MEI', label: 'MEI', desc: 'Faturamento até R$ 6.750 mensais.' },
  { value: 'SIMPLES', label: 'Simples Nacional', desc: 'Faturamento até R$ 400 mil mensais.' },
  { value: 'PRESUMIDO', label: 'Lucro Presumido', desc: 'Para empresas de médio porte.' },
  { value: 'REAL', label: 'Lucro Real', desc: 'Apuração detalhada de lucros e custos.' },
  { value: 'SEM_EMPRESA', label: 'Ainda não tenho empresa formalizada', desc: 'Tudo bem — você pode formalizar depois.' },
] as const;

function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export const StepCompany: React.FC<StepProps> = ({ draft, state, patch }) => {
  const cnpjValue = draft.cnpj ?? state.cnpj ?? '';
  const cnpjDisplay = cnpjValue ? maskCnpj(cnpjValue) : '';
  const optOut = draft.cnpj === null;

  return (
    <>
      <section className={styles.section}>
        <label className={styles.fieldLabel}>
          CNPJ
          <span className={styles.fieldOptional}>(opcional)</span>
        </label>
        <p className={styles.fieldHint}>
          Se você já tem CNPJ, preencher acelera suas configurações fiscais.
        </p>
        <input
          type="text"
          className={styles.cnpjInput}
          placeholder="00.000.000/0000-00"
          value={cnpjDisplay}
          disabled={optOut}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
            patch({ cnpj: digits || null });
          }}
          maxLength={18}
        />
        <label className={styles.optOut}>
          <input
            type="checkbox"
            checked={optOut}
            onChange={(e) => patch({ cnpj: e.target.checked ? null : '' })}
          />
          Ainda não possuo CNPJ formalizado
        </label>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>O que sua empresa vende hoje?</h3>
        <p className={styles.sectionHint}>Isso libera as funções certas desde o primeiro acesso.</p>
        <div className={styles.cardList}>
          {BUSINESS_TYPE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.desc}
              selected={(draft.businessType ?? state.businessType) === opt.value}
              onClick={() => patch({ businessType: opt.value as any })}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Qual segmento representa sua loja?</h3>
        <p className={styles.sectionHint}>Escolha o mais próximo da sua realidade — cada um tem particularidades.</p>
        <div className={styles.cardList}>
          {SEGMENT_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={(draft.segment ?? state.segment) === opt.value}
              onClick={() => patch({ segment: opt.value as any })}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Qual o regime tributário da sua empresa?</h3>
        <p className={styles.sectionHint}>Isso ajuda a orientar suas rotinas fiscais. Sem empresa? Sem problemas.</p>
        <div className={styles.cardList}>
          {TAX_REGIME_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.desc}
              selected={(draft.taxRegime ?? state.taxRegime) === opt.value}
              onClick={() => patch({ taxRegime: opt.value as any })}
            />
          ))}
        </div>
      </section>
    </>
  );
};

/* ═══════════ STEP 3 — Operação ═══════════ */

const MULTI_STORE_OPTIONS = [
  { value: 'unica', label: 'Não, tenho apenas uma loja', desc: 'Operação centralizada em um único ponto.' },
  { value: 'integrada', label: 'Sim, e preciso de gestão integrada', desc: 'Múltiplas lojas com estoque e relatórios consolidados.' },
  { value: 'independente', label: 'Sim, mas cada loja tem gestão independente', desc: 'Lojas separadas com gestão própria.' },
] as const;

const SALES_CHANNEL_OPTIONS = [
  { value: 'fisica', label: 'Loja física', icon: <Store size={20} /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={20} /> },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={20} /> },
  { value: 'tiktok', label: 'TikTok', icon: <Music2 size={20} /> },
  { value: 'ecommerce', label: 'E-commerce próprio', icon: <Globe size={20} /> },
  { value: 'marketplace', label: 'Marketplace', icon: <Link2 size={20} /> },
  { value: 'outras_redes', label: 'Outras redes sociais', icon: <Share2 size={20} /> },
] as const;

function toggleInArray<T extends string>(arr: T[] | undefined, value: T): T[] {
  const list = arr || [];
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const StepOperation: React.FC<StepProps> = ({ draft, state, patch }) => {
  const channels = draft.salesChannels ?? state.salesChannels ?? [];
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Hoje você opera mais de uma loja?</h3>
        <p className={styles.sectionHint}>Impacta a forma como organizamos estoque e relatórios.</p>
        <div className={styles.cardList}>
          {MULTI_STORE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.desc}
              selected={(draft.multiStore ?? state.multiStore) === opt.value}
              onClick={() => patch({ multiStore: opt.value as any })}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Em quais canais você vende hoje?</h3>
        <p className={styles.sectionHint}>Pode marcar mais de um. Ativaremos os módulos certos.</p>
        <div className={styles.cardList}>
          {SALES_CHANNEL_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              multi
              selected={channels.includes(opt.value as any)}
              onClick={() => patch({ salesChannels: toggleInArray(channels as any, opt.value) })}
            />
          ))}
        </div>
      </section>
    </>
  );
};

/* ═══════════ STEP 4 — Como você opera hoje ═══════════ */

const CURRENT_CONTROL_OPTIONS = [
  { value: 'cabeca', label: 'Na minha cabeça', desc: 'Sem registro formal.', icon: <Brain size={20} /> },
  { value: 'caderno', label: 'Caderno / anotações', desc: 'Anotações manuais em papel.', icon: <BookOpen size={20} /> },
  { value: 'planilha', label: 'Planilha', desc: 'Excel, Google Sheets, etc.', icon: <Calculator size={20} /> },
  { value: 'erp', label: 'Sistema de gestão (ERP)', desc: 'Já uso um sistema dedicado.', icon: <Laptop size={20} /> },
] as const;

const EQUIPMENT_OPTIONS = [
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

export const StepToday: React.FC<StepProps> = ({ draft, state, patch }) => {
  const equipment = draft.equipment ?? state.equipment ?? [];
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Como você controla sua loja hoje?</h3>
        <p className={styles.sectionHint}>Não importa o ponto de partida — vamos adaptar a explicação a você.</p>
        <div className={styles.cardList}>
          {CURRENT_CONTROL_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.desc}
              selected={(draft.currentControl ?? state.currentControl) === opt.value}
              onClick={() => patch({ currentControl: opt.value as any })}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Quais equipamentos você usa?</h3>
        <p className={styles.sectionHint}>Pode marcar mais de um. Configuramos o sistema de acordo.</p>
        <div className={styles.cardList}>
          {EQUIPMENT_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              multi
              selected={equipment.includes(opt.value as any)}
              onClick={() => patch({ equipment: toggleInArray(equipment as any, opt.value) })}
            />
          ))}
        </div>
      </section>
    </>
  );
};

/* ═══════════ STEP 5 — Objetivos ═══════════ */

const IMPROVEMENT_GOALS_OPTIONS = [
  { value: 'financeiro', label: 'Organizar o financeiro', icon: <Calculator size={20} /> },
  { value: 'estoque', label: 'Controlar melhor o estoque', icon: <Package size={20} /> },
  { value: 'vender_mais', label: 'Vender mais para os clientes que já tenho', icon: <TrendingUp size={20} /> },
  { value: 'integracao', label: 'Integrar loja física e canais digitais', icon: <Link2 size={20} /> },
  { value: 'profissionalizar', label: 'Profissionalizar a operação', icon: <Briefcase size={20} /> },
  { value: 'numeros', label: 'Entender melhor meus números', icon: <BarChart3 size={20} /> },
] as const;

const HEARD_ABOUT_OPTIONS = [
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

export const StepGoals: React.FC<StepProps> = ({ draft, state, patch }) => {
  const goals = draft.improvementGoals ?? state.improvementGoals ?? [];
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>O que você mais quer melhorar nos próximos meses?</h3>
        <p className={styles.sectionHint}>Pode marcar mais de um. Vamos montar sua trilha personalizada.</p>
        <div className={styles.cardList}>
          {IMPROVEMENT_GOALS_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              multi
              selected={goals.includes(opt.value as any)}
              onClick={() => patch({ improvementGoals: toggleInArray(goals as any, opt.value) })}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Como você conheceu o MINI ERP?</h3>
        <p className={styles.sectionHint}>Nos ajuda a entender o que funciona melhor pra chegar até você.</p>
        <div className={styles.cardList}>
          {HEARD_ABOUT_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={(draft.heardAbout ?? state.heardAbout) === opt.value}
              onClick={() => patch({ heardAbout: opt.value as any })}
            />
          ))}
        </div>
      </section>
    </>
  );
};

/* ═══════════ STEP 6 — Sobre você ═══════════ */

const LEARNING_PREFS_OPTIONS = [
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

const TECH_LEVEL_OPTIONS = [
  { value: 'basico', label: 'Só uso o básico e o que é obrigatório' },
  { value: 'necessario', label: 'Uso o necessário, sem gostar muito de complicação' },
  { value: 'curioso', label: 'Gosto de aprender e testar quando vejo valor' },
  { value: 'entusiasta', label: 'Sou entusiasta e gosto de explorar' },
] as const;

const TUTORIAL_PREF_OPTIONS = [
  { value: 'video', label: 'Ver um vídeo curto', icon: <PlayCircle size={20} /> },
  { value: 'passo_a_passo', label: 'Ler um passo a passo', icon: <ListChecks size={20} /> },
  { value: 'tour', label: 'Fazer um tour guiado', icon: <Compass size={20} /> },
  { value: 'explorar', label: 'Explorar sozinho', icon: <MousePointer2 size={20} /> },
] as const;

export const StepAboutYou: React.FC<StepProps> = ({ draft, state, patch }) => {
  const prefs = draft.learningPrefs ?? state.learningPrefs ?? [];
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Como você costuma aprender?</h3>
        <p className={styles.sectionHint}>Pode marcar mais de um. Vamos enviar conteúdos certeiros.</p>
        <div className={styles.cardList}>
          {LEARNING_PREFS_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              multi
              selected={prefs.includes(opt.value as any)}
              onClick={() => patch({ learningPrefs: toggleInArray(prefs as any, opt.value) })}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Qual seu nível de experiência com tecnologia?</h3>
        <p className={styles.sectionHint}>Vamos ajustar o ritmo da sua jornada conforme sua resposta.</p>
        <div className={styles.cardList}>
          {TECH_LEVEL_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              selected={(draft.techLevel ?? state.techLevel) === opt.value}
              onClick={() => patch({ techLevel: opt.value as any })}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Como prefere aprender sobre o sistema?</h3>
        <p className={styles.sectionHint}>Vamos guiar seu primeiro acesso do jeito que faz mais sentido pra você.</p>
        <div className={styles.cardList}>
          {TUTORIAL_PREF_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={(draft.tutorialPref ?? state.tutorialPref) === opt.value}
              onClick={() => patch({ tutorialPref: opt.value as any })}
            />
          ))}
        </div>
      </section>
    </>
  );
};

/* ═══════════ STEP 7 — Contato ═══════════ */

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`));
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`));
}

export const StepContact: React.FC<StepProps> = ({ draft, state, patch }) => {
  const whatsappDigits = draft.whatsapp ?? state.whatsapp ?? '';
  const whatsappDisplay = whatsappDigits ? maskPhone(whatsappDigits) : '';
  return (
    <>
      <section className={styles.section}>
        <div className={styles.contactIntro}>
          <Phone size={32} className={styles.contactIcon} />
          <div>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Quase lá! 🚀</h3>
            <p className={styles.sectionHint} style={{ marginTop: 4 }}>
              Informe seu WhatsApp para receber orientações, dicas de uso e suporte rápido
              durante seu período inicial.
            </p>
          </div>
        </div>

        <label className={styles.fieldLabel} htmlFor="onboarding-whatsapp">
          WhatsApp para contato
          <span className={styles.fieldRequired}>*</span>
        </label>
        <input
          id="onboarding-whatsapp"
          type="tel"
          className={styles.cnpjInput}
          placeholder="(11) 99999-8888"
          value={whatsappDisplay}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
            patch({ whatsapp: digits });
          }}
          autoComplete="tel"
          inputMode="numeric"
        />
        <p className={styles.fieldHint} style={{ marginTop: 8 }}>
          Não enviamos spam. Você pode pedir pra parar a qualquer momento.
        </p>
      </section>
    </>
  );
};
