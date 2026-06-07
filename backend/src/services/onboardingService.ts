import prisma from '../db/prismaClient';
import { Prisma } from '@prisma/client';

// ── Enums permitidos (validados também na rota via express-validator) ──
//   Mantidos como const arrays para reaproveitar em validators e em testes.

export const TAX_REGIMES = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL', 'SEM_EMPRESA'] as const;
export const BUSINESS_TYPES = ['produtos', 'servicos', 'ambos'] as const;
export const SEGMENTS = [
  'moda', 'casa', 'alimentacao', 'eletronicos', 'papelaria',
  'construcao', 'pet', 'servicos', 'industria', 'bar',
] as const;
export const MULTI_STORE_OPTIONS = ['unica', 'integrada', 'independente'] as const;
export const SALES_CHANNELS = [
  'fisica', 'whatsapp', 'instagram', 'tiktok', 'ecommerce', 'marketplace', 'outras_redes',
] as const;
export const HEARD_ABOUT = [
  'indicacao', 'instagram', 'whatsapp', 'google', 'evento',
  'redes_sociais', 'site', 'blog', 'outro',
] as const;
export const CURRENT_CONTROLS = ['cabeca', 'caderno', 'planilha', 'erp'] as const;
export const IMPROVEMENT_GOALS = [
  'financeiro', 'estoque', 'vender_mais', 'integracao', 'profissionalizar', 'numeros',
] as const;
export const EQUIPMENT = [
  'pdv_dedicado', 'impressora_termica', 'impressora_comum', 'leitor_barras',
  'gaveta', 'balanca', 'maquininha', 'so_celular', 'nenhum',
] as const;
export const LEARNING_PREFS = [
  'nao_estudo', 'youtube', 'instagram', 'tiktok', 'eventos',
  'sebrae', 'cursos', 'podcasts', 'indicacao', 'outros',
] as const;
export const TECH_LEVELS = ['basico', 'necessario', 'curioso', 'entusiasta'] as const;
export const TUTORIAL_PREFS = ['video', 'passo_a_passo', 'tour', 'explorar'] as const;

// ── Tipos do payload aceito (partial em updatePartial, completo em complete) ──

export interface OnboardingPatch {
  // Company fields
  cnpj?: string | null;
  taxRegime?: typeof TAX_REGIMES[number];
  segment?: typeof SEGMENTS[number];
  businessType?: typeof BUSINESS_TYPES[number];
  multiStore?: typeof MULTI_STORE_OPTIONS[number];
  // OnboardingResponse fields
  salesChannels?: string[];
  heardAbout?: typeof HEARD_ABOUT[number];
  currentControl?: typeof CURRENT_CONTROLS[number];
  improvementGoals?: string[];
  equipment?: string[];
  learningPrefs?: string[];
  techLevel?: typeof TECH_LEVELS[number];
  tutorialPref?: typeof TUTORIAL_PREFS[number];
  whatsapp?: string;
}

/**
 * Vista combinada do estado de onboarding do tenant — junta dados de Company
 * (fiscal) e OnboardingResponse (UX/marketing) em uma resposta única para o
 * frontend retomar de onde parou.
 */
export interface OnboardingState {
  completed: boolean;
  completedAt: Date | null;
  // Company (pode não ter sido criada ainda em edge cases — defensive)
  cnpj: string | null;
  taxRegime: string | null;
  segment: string | null;
  businessType: string | null;
  multiStore: string | null;
  // OnboardingResponse (pode ser null se nunca passou)
  salesChannels: string[];
  heardAbout: string | null;
  currentControl: string | null;
  improvementGoals: string[];
  equipment: string[];
  learningPrefs: string[];
  techLevel: string | null;
  tutorialPref: string | null;
  whatsapp: string | null;
}

const EMPTY_STATE = (completedAt: Date | null = null): OnboardingState => ({
  completed: completedAt !== null,
  completedAt,
  cnpj: null,
  taxRegime: null,
  segment: null,
  businessType: null,
  multiStore: null,
  salesChannels: [],
  heardAbout: null,
  currentControl: null,
  improvementGoals: [],
  equipment: [],
  learningPrefs: [],
  techLevel: null,
  tutorialPref: null,
  whatsapp: null,
});

export class OnboardingService {
  /**
   * Retorna o estado atual do onboarding (combina Company + OnboardingResponse).
   * Usado pelo frontend ao montar o /onboarding para retomar de onde parou.
   */
  static async get(userId: number): Promise<OnboardingState> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompletedAt: true,
        company: {
          select: { cnpj: true, taxRegime: true, segment: true, businessType: true, multiStore: true },
        },
        onboarding: true,
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const state = EMPTY_STATE(user.onboardingCompletedAt);
    if (user.company) {
      state.cnpj = user.company.cnpj;
      state.taxRegime = user.company.taxRegime;
      state.segment = user.company.segment;
      state.businessType = user.company.businessType;
      state.multiStore = user.company.multiStore;
    }
    if (user.onboarding) {
      state.salesChannels = user.onboarding.salesChannels;
      state.heardAbout = user.onboarding.heardAbout;
      state.currentControl = user.onboarding.currentControl;
      state.improvementGoals = user.onboarding.improvementGoals;
      state.equipment = user.onboarding.equipment;
      state.learningPrefs = user.onboarding.learningPrefs;
      state.techLevel = user.onboarding.techLevel;
      state.tutorialPref = user.onboarding.tutorialPref;
      state.whatsapp = user.onboarding.whatsapp;
    }
    return state;
  }

  /**
   * Aplica um patch parcial — pode vir só alguns campos (cada step do wizard).
   *
   * Splits transparentemente entre Company (fiscal) e OnboardingResponse
   * (UX/marketing). Tudo em uma transação para nunca ficar inconsistente.
   *
   * `whatsapp` é opcional aqui (só obrigatório no `complete`) — assim o
   * frontend pode salvar progresso antes de chegar no último step.
   */
  static async updatePartial(userId: number, patch: OnboardingPatch): Promise<OnboardingState> {
    const companyFields = {
      ...(patch.cnpj !== undefined && { cnpj: patch.cnpj || null }),
      ...(patch.taxRegime !== undefined && { taxRegime: patch.taxRegime }),
      ...(patch.segment !== undefined && { segment: patch.segment }),
      ...(patch.businessType !== undefined && { businessType: patch.businessType }),
      ...(patch.multiStore !== undefined && { multiStore: patch.multiStore }),
    };
    const hasCompanyChanges = Object.keys(companyFields).length > 0;

    const onboardingFields = {
      ...(patch.salesChannels !== undefined && { salesChannels: patch.salesChannels }),
      ...(patch.heardAbout !== undefined && { heardAbout: patch.heardAbout }),
      ...(patch.currentControl !== undefined && { currentControl: patch.currentControl }),
      ...(patch.improvementGoals !== undefined && { improvementGoals: patch.improvementGoals }),
      ...(patch.equipment !== undefined && { equipment: patch.equipment }),
      ...(patch.learningPrefs !== undefined && { learningPrefs: patch.learningPrefs }),
      ...(patch.techLevel !== undefined && { techLevel: patch.techLevel }),
      ...(patch.tutorialPref !== undefined && { tutorialPref: patch.tutorialPref }),
      ...(patch.whatsapp !== undefined && { whatsapp: patch.whatsapp }),
    };
    const hasOnboardingChanges = Object.keys(onboardingFields).length > 0;

    try {
      await prisma.$transaction(async (tx) => {
        if (hasCompanyChanges) {
          // Company é criada no registro do usuário (vide AuthService); sempre existe.
          await tx.company.update({
            where: { userId },
            data: companyFields,
          });
        }

        if (hasOnboardingChanges) {
          // Upsert: ou cria com defaults + os campos do patch, ou atualiza.
          // `whatsapp` é NOT NULL no schema, mas no create inicial não temos garantia
          // de que o cliente já mandou — então usamos string vazia como placeholder
          // e validamos a presença real no `complete`.
          await tx.onboardingResponse.upsert({
            where: { userId },
            create: {
              userId,
              whatsapp: patch.whatsapp ?? '',
              ...onboardingFields,
            },
            update: onboardingFields,
          });
        }
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Apenas CNPJ tem @unique global — mensagem clara.
        throw new Error('Este CNPJ já está cadastrado no sistema');
      }
      throw error;
    }

    return this.get(userId);
  }

  /**
   * Finaliza o onboarding. Aplica o último patch (incluindo whatsapp obrigatório),
   * valida que campos mínimos estão preenchidos e seta `onboardingCompletedAt`.
   *
   * Idempotente: se já estava completo, atualiza dados mas mantém o `completedAt`
   * original (não retroage data de conclusão).
   */
  static async complete(userId: number, patch: OnboardingPatch): Promise<OnboardingState> {
    // Aplica o patch final primeiro.
    await this.updatePartial(userId, patch);

    // Valida campos mínimos para considerar o onboarding "completo".
    const state = await this.get(userId);
    if (!state.whatsapp || state.whatsapp.trim().length === 0) {
      throw new Error('WhatsApp é obrigatório para concluir o onboarding');
    }
    if (!state.businessType) {
      throw new Error('Tipo de negócio é obrigatório');
    }
    if (!state.segment) {
      throw new Error('Segmento é obrigatório');
    }

    // Seta completedAt apenas se ainda não estava completo (idempotência).
    if (!state.completedAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });
    }

    return this.get(userId);
  }
}
