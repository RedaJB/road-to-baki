'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type BakiPhase = 'form' | 'loading' | 'done';

export interface BakiAnswers {
  pointFaible: string | null;
  objectif: string | null;
  tempsMax: string | null;
  poids: number | null;
  taille: number | null;
}

const BAKI_STEP_KEYS: (keyof BakiAnswers)[] = [
  'pointFaible',
  'objectif',
  'tempsMax',
  'poids',
  'taille',
];

interface BakiFlowState {
  pointFaible: string | null;
  objectif: string | null;
  tempsMax: string | null;
  phase: BakiPhase;
  step: number;
  hasCompletedBaki: boolean;
  initialized: boolean;
  bakiAnswers: BakiAnswers;
  setBakiAnswer: (key: keyof BakiAnswers, value: string | number | null) => void;
  nextBakiStep: () => void;
  prevBakiStep: () => void;
  launchAnalysis: () => void;
  completeBakiFlow: () => void;
}

const STORAGE_KEY = 'roadtobaki_baki_flow_v1';

const defaultAnswers: BakiAnswers = {
  pointFaible: null,
  objectif: null,
  tempsMax: null,
  poids: null,
  taille: null,
};

const BakiFlowContext = createContext<BakiFlowState | undefined>(undefined);

export function BakiFlowProvider({ children }: { children: React.ReactNode }) {
  const [pointFaible, setPointFaible] = useState<string | null>(null);
  const [objectif, setObjectif] = useState<string | null>(null);
  const [tempsMax, setTempsMax] = useState<string | null>(null);
  const [poids, setPoids] = useState<number | null>(null);
  const [taille, setTaille] = useState<number | null>(null);
  const [phase, setPhase] = useState<BakiPhase>('form');
  const [step, setStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        pointFaible?: string | null;
        objectif?: string | null;
        tempsMax?: string | null;
        poids?: number | null;
        taille?: number | null;
        phase?: BakiPhase;
        step?: number;
      };
      if (parsed.pointFaible != null) setPointFaible(parsed.pointFaible);
      if (parsed.objectif != null) setObjectif(parsed.objectif);
      if (parsed.tempsMax != null) setTempsMax(parsed.tempsMax);
      if (typeof parsed.poids === 'number') setPoids(parsed.poids);
      if (typeof parsed.taille === 'number') setTaille(parsed.taille);
      if (parsed.phase) setPhase(parsed.phase);
      if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step < BAKI_STEP_KEYS.length) {
        setStep(parsed.step);
      }
    } catch {
      // ignore
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pointFaible,
          objectif,
          tempsMax,
          poids,
          taille,
          phase,
          step,
        }),
      );
    } catch {
      // ignore
    }
  }, [pointFaible, objectif, tempsMax, poids, taille, phase, step]);

  const setBakiAnswer = useCallback((key: keyof BakiAnswers, value: string | number | null) => {
    switch (key) {
      case 'pointFaible':
        setPointFaible(typeof value === 'string' ? value : null);
        break;
      case 'objectif':
        setObjectif(typeof value === 'string' ? value : null);
        break;
      case 'tempsMax':
        setTempsMax(typeof value === 'string' ? value : null);
        break;
      case 'poids':
        setPoids(typeof value === 'number' ? value : null);
        break;
      case 'taille':
        setTaille(typeof value === 'number' ? value : null);
        break;
    }
  }, []);

  const nextBakiStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, BAKI_STEP_KEYS.length - 1));
  }, []);

  const prevBakiStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const launchAnalysis = useCallback(() => {
    setPhase('loading');
  }, []);

  const completeBakiFlow = useCallback(() => {
    setPhase('done');
  }, []);

  const bakiAnswers = useMemo<BakiAnswers>(
    () => ({ pointFaible, objectif, tempsMax, poids, taille }),
    [pointFaible, objectif, tempsMax, poids, taille],
  );

  const value = useMemo<BakiFlowState>(
    () => ({
      pointFaible,
      objectif,
      tempsMax,
      phase,
      step,
      hasCompletedBaki: phase === 'done',
      initialized,
      bakiAnswers,
      setBakiAnswer,
      nextBakiStep,
      prevBakiStep,
      launchAnalysis,
      completeBakiFlow,
    }),
    [
      pointFaible,
      objectif,
      tempsMax,
      phase,
      step,
      initialized,
      bakiAnswers,
      setBakiAnswer,
      nextBakiStep,
      prevBakiStep,
      launchAnalysis,
      completeBakiFlow,
    ],
  );

  return (
    <BakiFlowContext.Provider value={value}>{children}</BakiFlowContext.Provider>
  );
}

export function useBakiFlow() {
  const ctx = useContext(BakiFlowContext);
  if (!ctx) {
    throw new Error('useBakiFlow must be used within BakiFlowProvider');
  }
  return ctx;
}
