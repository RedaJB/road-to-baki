'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Douleur =
  | 'dos'
  | 'genoux'
  | 'epaules'
  | 'poignets'
  | 'autre';

export interface OnboardingAnswers {
  sexe: 'homme' | 'femme' | null;
  age: number | null;
  taille: number | null;
  poids: number | null;
  poidsCible: number | null;
  dateObjectif: string | null; // ISO date
  activite: 'sedentaire' | 'actif' | 'tres_actif' | null;
  experience: 'debutant' | 'intermediaire' | 'avance' | null;
  frequence: number | null;
  douleurs: Douleur[] | null;
  objectifPrincipal: 'maigrir' | 'prendre_muscle' | 'recomposition' | 'forme' | null;
  motivation: 'sante' | 'esthetique' | 'performance' | 'confiance' | null;
  raisonPertePoids: 'sante' | 'look' | 'energie' | 'autre' | null;
  niveauStress: 'faible' | 'moyen' | 'eleve' | null;
  qualiteSommeil: 'mauvais' | 'moyen' | 'bon' | null;
  regime: 'aucun' | 'halal' | 'vegetarien' | 'sans_lactose' | 'autre' | null;
  contraintesSante: 'aucune' | 'diabete' | 'thyroide' | 'hypertension' | 'autre' | null;
  shonenArchetype: 'baki' | 'yujiro' | 'jack' | 'doppo' | null;
  resilience: 'debutant' | 'guerrier' | 'monstre' | 'demon' | null;
  dietType: 'carnivore' | 'equilibre' | 'vegetarien' | null;
  demonTraining: 'oui' | 'non' | null;
  trainingLocation: 'salle' | 'maison' | null;
}

type OnboardingState = {
  step: number;
  hasCompletedOnboarding: boolean;
  initialized: boolean;
  answers: OnboardingAnswers;
  setAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
};

const STORAGE_KEY = 'roadtobaki_onboarding_v3';

const defaultAnswers: OnboardingAnswers = {
  sexe: null,
  age: null,
  taille: null,
  poids: null,
  poidsCible: null,
  dateObjectif: null,
  activite: null,
  experience: null,
  frequence: null,
  douleurs: null,
  objectifPrincipal: null,
  motivation: null,
  raisonPertePoids: null,
  niveauStress: null,
  qualiteSommeil: null,
  regime: null,
  contraintesSante: null,
  shonenArchetype: null,
  resilience: null,
  dietType: null,
  demonTraining: null,
  trainingLocation: null,
};

const OnboardingContext = createContext<OnboardingState | undefined>(undefined);

function loadFromStorage():
  | { step: number; hasCompleted: boolean; answers: OnboardingAnswers }
  | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      step?: number;
      hasCompleted?: boolean;
      answers?: any;
    } | null;
    if (!parsed?.answers) return null;

    const allowed = new Set<Douleur>([
      'dos',
      'genoux',
      'epaules',
      'poignets',
      'autre',
    ]);
    const rawDouleurs = (parsed.answers as any).douleurs as unknown;
    const normalizedDouleurs: OnboardingAnswers['douleurs'] =
      typeof rawDouleurs === 'string'
        ? rawDouleurs === 'non'
          ? []
          : allowed.has(rawDouleurs as Douleur)
            ? [rawDouleurs as Douleur]
            : null
        : Array.isArray(rawDouleurs)
          ? (rawDouleurs.filter(
              (d) => typeof d === 'string' && allowed.has(d as Douleur),
            ) as Douleur[])
          : null;

    const answers: OnboardingAnswers = {
      ...defaultAnswers,
      ...parsed.answers,
      douleurs: normalizedDouleurs,
    };

    return {
      step: parsed.step ?? 0,
      hasCompleted: !!parsed.hasCompleted,
      answers,
    };
  } catch {
    return null;
  }
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setStep(stored.step);
      setHasCompletedOnboarding(stored.hasCompleted);
      setAnswers(stored.answers);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    try {
      const payload = JSON.stringify({
        step,
        hasCompleted: hasCompletedOnboarding,
        answers,
      });
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // ignore
    }
  }, [initialized, step, hasCompletedOnboarding, answers]);

  const setAnswer = useCallback(
    <K extends keyof OnboardingAnswers>(
      key: K,
      value: OnboardingAnswers[K],
    ) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const value = useMemo<OnboardingState>(
    () => ({
      step,
      hasCompletedOnboarding,
      initialized,
      answers,
      setAnswer,
      nextStep: () => setStep((s) => s + 1),
      prevStep: () => setStep((s) => Math.max(0, s - 1)),
      completeOnboarding: () => setHasCompletedOnboarding(true),
    }),
    [step, hasCompletedOnboarding, initialized, answers, setAnswer],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}

