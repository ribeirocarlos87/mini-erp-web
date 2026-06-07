import apiClient from './api';

// ── Enums espelham os do backend (services/onboardingService.ts) ──
// Mantidos como const arrays para reaproveitar em <select> e validações.

export const TAX_REGIMES = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL', 'SEM_EMPRESA'] as const;
export type TaxRegime = (typeof TAX_REGIMES)[number];

export const BUSINESS_TYPES = ['produtos', 'servicos', 'ambos'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const SEGMENTS = [
  'moda', 'casa', 'alimentacao', 'eletronicos', 'papelaria',
  'construcao', 'pet', 'servicos', 'industria', 'bar',
] as const;
export type Segment = (typeof SEGMENTS)[number];

export const MULTI_STORE_OPTIONS = ['unica', 'integrada', 'independente'] as const;
export type MultiStoreOption = (typeof MULTI_STORE_OPTIONS)[number];

export const SALES_CHANNELS = [
  'fisica', 'whatsapp', 'instagram', 'tiktok', 'ecommerce', 'marketplace', 'outras_redes',
] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const HEARD_ABOUT = [
  'indicacao', 'instagram', 'whatsapp', 'google', 'evento',
  'redes_sociais', 'site', 'blog', 'outro',
] as const;
export type HeardAbout = (typeof HEARD_ABOUT)[number];

export const CURRENT_CONTROLS = ['cabeca', 'caderno', 'planilha', 'erp'] as const;
export type CurrentControl = (typeof CURRENT_CONTROLS)[number];

export const IMPROVEMENT_GOALS = [
  'financeiro', 'estoque', 'vender_mais', 'integracao', 'profissionalizar', 'numeros',
] as const;
export type ImprovementGoal = (typeof IMPROVEMENT_GOALS)[number];

export const EQUIPMENT = [
  'pdv_dedicado', 'impressora_termica', 'impressora_comum', 'leitor_barras',
  'gaveta', 'balanca', 'maquininha', 'so_celular', 'nenhum',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const LEARNING_PREFS = [
  'nao_estudo', 'youtube', 'instagram', 'tiktok', 'eventos',
  'sebrae', 'cursos', 'podcasts', 'indicacao', 'outros',
] as const;
export type LearningPref = (typeof LEARNING_PREFS)[number];

export const TECH_LEVELS = ['basico', 'necessario', 'curioso', 'entusiasta'] as const;
export type TechLevel = (typeof TECH_LEVELS)[number];

export const TUTORIAL_PREFS = ['video', 'passo_a_passo', 'tour', 'explorar'] as const;
export type TutorialPref = (typeof TUTORIAL_PREFS)[number];

// ── Tipos do payload (espelham o service do backend) ──

export interface OnboardingPatch {
  cnpj?: string | null;
  taxRegime?: TaxRegime;
  segment?: Segment;
  businessType?: BusinessType;
  multiStore?: MultiStoreOption;
  salesChannels?: SalesChannel[];
  heardAbout?: HeardAbout;
  currentControl?: CurrentControl;
  improvementGoals?: ImprovementGoal[];
  equipment?: Equipment[];
  learningPrefs?: LearningPref[];
  techLevel?: TechLevel;
  tutorialPref?: TutorialPref;
  whatsapp?: string;
}

export interface OnboardingState {
  completed: boolean;
  completedAt: string | null;
  cnpj: string | null;
  taxRegime: TaxRegime | null;
  segment: Segment | null;
  businessType: BusinessType | null;
  multiStore: MultiStoreOption | null;
  salesChannels: SalesChannel[];
  heardAbout: HeardAbout | null;
  currentControl: CurrentControl | null;
  improvementGoals: ImprovementGoal[];
  equipment: Equipment[];
  learningPrefs: LearningPref[];
  techLevel: TechLevel | null;
  tutorialPref: TutorialPref | null;
  whatsapp: string | null;
}

export const onboardingService = {
  get: async (): Promise<OnboardingState> => {
    const { data } = await apiClient.get('/onboarding');
    return data;
  },

  updatePartial: async (patch: OnboardingPatch): Promise<OnboardingState> => {
    const { data } = await apiClient.patch('/onboarding', patch);
    return data;
  },

  complete: async (patch: OnboardingPatch): Promise<OnboardingState> => {
    const { data } = await apiClient.post('/onboarding/complete', patch);
    return data;
  },
};
