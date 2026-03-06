'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Douleur } from './onboarding-context';

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

export type FastingMode = 'none' | '16-8' | '18-6' | '20-4' | 'omad';

interface AppState {
  weightHistory: WeightEntry[];
  addWeight: (weight: number) => void;
  fastingMode: FastingMode;
  setFastingMode: (mode: FastingMode) => void;
  trainingDoneDates: string[];
  setTrainingDoneForDate: (date: string, done: boolean) => void;
  douleurs: Douleur[] | null;
  setDouleurs: (d: Douleur[] | null) => void;
}

const STORAGE_KEY = 'roadtobaki_app_v1';

const AppContext = createContext<AppState | undefined>(undefined);

export const FASTING_PLANS_UI: Record<
  FastingMode,
  { label: string; hoursFast: number }
> = {
  none: { label: 'Pas de jeûne', hoursFast: 0 },
  '16-8': { label: '16h jeûne / 8h fenêtre', hoursFast: 16 },
  '18-6': { label: '18h jeûne / 6h fenêtre', hoursFast: 18 },
  '20-4': { label: '20h jeûne / 4h fenêtre', hoursFast: 20 },
  omad: { label: 'OMAD (1 repas)', hoursFast: 22 },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [fastingMode, setFastingModeState] = useState<FastingMode>('none');
  const [trainingDoneDates, setTrainingDoneDates] = useState<string[]>([]);
  const [douleurs, setDouleursState] = useState<Douleur[] | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        weightHistory?: WeightEntry[];
        fastingMode?: FastingMode;
        trainingDoneDates?: string[];
        douleurs?: Douleur[] | null;
      };
      if (Array.isArray(parsed.weightHistory)) {
        setWeightHistory(parsed.weightHistory);
      }
      if (parsed.fastingMode) setFastingModeState(parsed.fastingMode);
      if (Array.isArray(parsed.trainingDoneDates)) {
        setTrainingDoneDates(parsed.trainingDoneDates);
      }
      if (parsed.douleurs) setDouleursState(parsed.douleurs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          weightHistory,
          fastingMode,
          trainingDoneDates,
          douleurs,
        }),
      );
    } catch {
      // ignore
    }
  }, [weightHistory, fastingMode, trainingDoneDates, douleurs]);

  const addWeight = useCallback((weight: number) => {
    const w = Math.round(weight * 10) / 10;
    if (w < 30 || w > 300) return;
    const today = new Date().toISOString().split('T')[0];
    setWeightHistory((prev) => {
      const filtered = prev.filter(
        (e) => e.date !== today && e.weight >= 30 && e.weight <= 300,
      );
      return [...filtered, { date: today, weight: w }].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });
  }, []);

  const setTrainingDoneForDate = useCallback((date: string, done: boolean) => {
    setTrainingDoneDates((prev) => {
      if (done) {
        if (prev.includes(date)) return prev;
        return [...prev, date];
      }
      return prev.filter((d) => d !== date);
    });
  }, []);

  const setFastingMode = useCallback((mode: FastingMode) => {
    setFastingModeState(mode);
  }, []);

  const setDouleurs = useCallback((d: Douleur[] | null) => {
    setDouleursState(d);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      weightHistory,
      addWeight,
      fastingMode,
      setFastingMode,
      trainingDoneDates,
      setTrainingDoneForDate,
      douleurs,
      setDouleurs,
    }),
    [
      weightHistory,
      addWeight,
      fastingMode,
      setFastingMode,
      trainingDoneDates,
      setTrainingDoneForDate,
      douleurs,
      setDouleurs,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}

