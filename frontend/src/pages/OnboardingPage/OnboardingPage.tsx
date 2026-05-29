import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  onboardingService,
  OnboardingPatch,
  OnboardingState,
} from '../../services/onboardingService';
import OnboardingLayout from './OnboardingLayout';
import {
  StepWelcome,
  StepCompany,
  StepOperation,
  StepToday,
  StepGoals,
  StepAboutYou,
  StepContact,
} from './steps';

const TOTAL_STEPS = 7;

const EMPTY_STATE: OnboardingState = {
  completed: false,
  completedAt: null,
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
};

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const markOnboardingComplete = useAuthStore((s) => s.markOnboardingComplete);

  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState>(EMPTY_STATE);
  const [draft, setDraft] = useState<OnboardingPatch>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Carrega estado atual ao montar — usuário pode estar retomando o wizard.
  useEffect(() => {
    let active = true;
    onboardingService
      .get()
      .then((s) => {
        if (!active) return;
        if (s.completed) {
          // Já completou — não deveria estar aqui. Redireciona.
          navigate('/dashboard', { replace: true });
          return;
        }
        setState(s);
        setInitialized(true);
      })
      .catch(() => {
        if (active) setInitialized(true);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const patch = (changes: Partial<OnboardingPatch>) => {
    setDraft((prev) => ({ ...prev, ...changes }));
    setError(null);
  };

  // Aplica a parte do draft do step atual no backend e em `state` local;
  // limpa o draft para o próximo step ficar partindo do estado salvo.
  async function saveProgress() {
    if (Object.keys(draft).length === 0) return state;
    setSaving(true);
    setError(null);
    try {
      const updated = await onboardingService.updatePartial(draft);
      setState(updated);
      setDraft({});
      return updated;
    } catch (err: any) {
      setError(
        err?.response?.data?.errors?.[0]?.msg ||
          err?.response?.data?.error ||
          'Erro ao salvar suas respostas. Tente novamente.'
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function validateCurrentStep(currentState: OnboardingState, currentDraft: OnboardingPatch): string | null {
    // Validações leves de UX — backend valida de novo no /complete.
    // Step 0 (welcome): nada a validar.
    // Step 1 (Sua empresa): pede businessType e segment.
    // Step 2 (Operação): pede multiStore.
    // Step 3 (Hoje): pede currentControl.
    // Step 4 (Objetivos): nenhum obrigatório (mas sugerir 1).
    // Step 5 (Sobre você): pede techLevel e tutorialPref.
    // Step 6 (Contato): pede whatsapp com 10-11 dígitos.
    const v = <K extends keyof OnboardingPatch>(k: K) =>
      (currentDraft[k] ?? (currentState as any)[k]) as OnboardingPatch[K];
    switch (step) {
      case 0:
        return null;
      case 1:
        if (!v('businessType')) return 'Selecione o que sua empresa vende.';
        if (!v('segment')) return 'Selecione o segmento da sua loja.';
        return null;
      case 2:
        if (!v('multiStore')) return 'Selecione a opção de multi-loja.';
        return null;
      case 3:
        if (!v('currentControl')) return 'Selecione como você controla sua loja hoje.';
        return null;
      case 4:
        return null;
      case 5:
        if (!v('techLevel')) return 'Selecione seu nível de experiência com tecnologia.';
        if (!v('tutorialPref')) return 'Selecione como prefere aprender o sistema.';
        return null;
      case 6: {
        const w = (v('whatsapp') as string | undefined) || '';
        if (!/^\d{10,11}$/.test(w)) return 'Informe um WhatsApp válido (DDD + número).';
        return null;
      }
      default:
        return null;
    }
  }

  async function handleNext() {
    const validationMsg = validateCurrentStep(state, draft);
    if (validationMsg) {
      setError(validationMsg);
      return;
    }
    try {
      const updated = await saveProgress();
      if (step === TOTAL_STEPS - 1) {
        // Último step — finaliza.
        setSaving(true);
        try {
          const finalState = await onboardingService.complete({});
          if (finalState.completedAt) {
            markOnboardingComplete(finalState.completedAt);
          }
          navigate('/dashboard', { replace: true });
        } catch (err: any) {
          setError(
            err?.response?.data?.error ||
              'Erro ao concluir o onboarding. Verifique os campos e tente novamente.'
          );
        } finally {
          setSaving(false);
        }
      } else {
        // Mantém o `updated` no state — próximo step parte dele.
        if (updated) setState(updated);
        setStep(step + 1);
      }
    } catch {
      /* erro já foi tratado em saveProgress */
    }
  }

  function handleBack() {
    setError(null);
    setDraft({});
    setStep(Math.max(0, step - 1));
  }

  if (!initialized) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#666', background: 'var(--color-slate-50)',
      }}>
        Carregando...
      </div>
    );
  }

  const titles = [
    'Bem-vindo ao MINI ERP',
    'Sua empresa',
    'Sua operação',
    'Como você opera hoje',
    'Seus objetivos',
    'Sobre você',
    'Tudo pronto!',
  ];

  const subtitles: (string | undefined)[] = [
    undefined,
    'Conte sobre o negócio para liberarmos os recursos certos.',
    'Como você vende hoje?',
    'Pra adaptar a experiência ao seu cenário atual.',
    'O que faz sentido pra sua loja agora.',
    'Pra ajustar o ritmo da sua jornada.',
    'Falta só uma informação pra liberar seu acesso.',
  ];

  const renderStep = () => {
    const stepProps = { draft, state, patch };
    switch (step) {
      case 0:
        return <StepWelcome name={user?.name || ''} />;
      case 1:
        return <StepCompany {...stepProps} />;
      case 2:
        return <StepOperation {...stepProps} />;
      case 3:
        return <StepToday {...stepProps} />;
      case 4:
        return <StepGoals {...stepProps} />;
      case 5:
        return <StepAboutYou {...stepProps} />;
      case 6:
        return <StepContact {...stepProps} />;
      default:
        return null;
    }
  };

  const nextLabel = step === 0 ? 'Começar' : step === TOTAL_STEPS - 1 ? 'Concluir e acessar' : 'Continuar';

  return (
    <OnboardingLayout
      title={titles[step]}
      subtitle={subtitles[step]}
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      onBack={step > 0 ? handleBack : undefined}
      onNext={handleNext}
      nextLabel={nextLabel}
      saving={saving}
      hideBack={step === 0}
      error={error}
    >
      {renderStep()}
    </OnboardingLayout>
  );
};

export default OnboardingPage;
