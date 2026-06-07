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
  Welcome,
  CnpjStep,
  WhatsappStep,
  SingleChoice,
  MultiChoice,
  STEP_CONFIGS,
  TOTAL_STEPS,
  StepConfig,
} from './steps';

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

function readValue<T>(field: keyof OnboardingPatch, draft: OnboardingPatch, state: OnboardingState): T | null {
  const fromDraft = (draft as any)[field];
  if (fromDraft !== undefined) return fromDraft;
  return ((state as any)[field] ?? null) as T | null;
}

function readArray(field: keyof OnboardingPatch, draft: OnboardingPatch, state: OnboardingState): string[] {
  const fromDraft = (draft as any)[field];
  if (fromDraft !== undefined) return fromDraft;
  return ((state as any)[field] ?? []) as string[];
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function validateStep(
  step: StepConfig,
  draft: OnboardingPatch,
  state: OnboardingState
): string | null {
  if (step.type === 'welcome') return null;
  if (step.type === 'cnpj') return null;
  if (step.type === 'whatsapp') {
    const w = (draft.whatsapp ?? state.whatsapp ?? '') as string;
    if (!/^\d{10,11}$/.test(w)) return 'Informe um WhatsApp válido com DDD.';
    return null;
  }
  if (!step.required) return null;
  if (step.type === 'single') {
    const v = readValue(step.field!, draft, state);
    if (!v) return 'Selecione uma opção para continuar.';
  }
  if (step.type === 'multi') {
    const arr = readArray(step.field!, draft, state);
    if (arr.length === 0) return 'Selecione ao menos uma opção.';
  }
  return null;
}

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const markOnboardingComplete = useAuthStore((s) => s.markOnboardingComplete);

  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<OnboardingState>(EMPTY_STATE);
  const [draft, setDraft] = useState<OnboardingPatch>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let active = true;
    onboardingService
      .get()
      .then((s) => {
        if (!active) return;
        if (s.completed) {
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

  const step = STEP_CONFIGS[stepIndex];

  function patch(changes: Partial<OnboardingPatch>) {
    setDraft((prev) => ({ ...prev, ...changes }));
    setError(null);
  }

  async function saveProgress(): Promise<OnboardingState> {
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

  async function handleNext() {
    const msg = validateStep(step, draft, state);
    if (msg) {
      setError(msg);
      return;
    }
    try {
      const updated = await saveProgress();
      if (stepIndex === TOTAL_STEPS - 1) {
        setSaving(true);
        try {
          const finalState = await onboardingService.complete({});
          if (finalState.completedAt) markOnboardingComplete(finalState.completedAt);
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
        if (updated) setState(updated);
        setStepIndex(stepIndex + 1);
      }
    } catch {
      /* erro tratado em saveProgress */
    }
  }

  function handleBack() {
    setError(null);
    setDraft({});
    setStepIndex(Math.max(0, stepIndex - 1));
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

  function renderStepBody() {
    if (step.type === 'welcome') {
      return <Welcome name={user?.name || ''} />;
    }
    if (step.type === 'cnpj') {
      return (
        <CnpjStep
          value={draft.cnpj !== undefined ? draft.cnpj : state.cnpj}
          onChange={(v) => patch({ cnpj: v })}
        />
      );
    }
    if (step.type === 'whatsapp') {
      return (
        <WhatsappStep
          value={draft.whatsapp ?? state.whatsapp}
          onChange={(digits) => patch({ whatsapp: digits })}
        />
      );
    }
    if (step.type === 'single') {
      const field = step.field!;
      return (
        <SingleChoice
          options={step.options as any}
          value={readValue<string>(field, draft, state)}
          onChange={(v) => patch({ [field]: v } as any)}
        />
      );
    }
    if (step.type === 'multi') {
      const field = step.field!;
      const values = readArray(field, draft, state);
      return (
        <MultiChoice
          options={step.options as any}
          values={values}
          onToggle={(v) => patch({ [field]: toggleInArray(values, v) } as any)}
        />
      );
    }
    return null;
  }

  const nextLabel =
    step.type === 'welcome' ? 'Começar' : stepIndex === TOTAL_STEPS - 1 ? 'Concluir e acessar' : 'Continuar';

  return (
    <OnboardingLayout
      title={step.title}
      subtitle={step.subtitle}
      currentStep={stepIndex}
      totalSteps={TOTAL_STEPS}
      onBack={stepIndex > 0 ? handleBack : undefined}
      onNext={handleNext}
      nextLabel={nextLabel}
      saving={saving}
      hideBack={stepIndex === 0}
      error={error}
    >
      {renderStepBody()}
    </OnboardingLayout>
  );
};

export default OnboardingPage;
