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
import { ActivityProvider, useActivity } from './activity-context';
import { todayISO } from './streak';

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

export type FastingMode = 'none' | '16-8' | '18-6' | '20-4' | 'omad';

interface AppState {
  /** l'état a été relu depuis le stockage local */
  loaded: boolean;
  isPremium: boolean;
  setPremium: (v: boolean) => void;
  weightHistory: WeightEntry[];
  addWeight: (weight: number) => void;
  waterIntakeByDate: ReturnType<typeof useActivity>['waterIntakeByDate'];
  addWater: ReturnType<typeof useActivity>['addWater'];
  stepsByDate: ReturnType<typeof useActivity>['stepsByDate'];
  setSteps: ReturnType<typeof useActivity>['setSteps'];
  fastingMode: FastingMode;
  setFastingMode: (mode: FastingMode) => void;
  trainingDoneDates: ReturnType<typeof useActivity>['trainingDoneDates'];
  setTrainingDoneForDate: ReturnType<typeof useActivity>['setTrainingDoneForDate'];
  trainingUnlockedDay: number;
  unlockTrainingDay: (day: number) => void;
  douleurs: Douleur[] | null;
  setDouleurs: (d: Douleur[] | null) => void;
  fastingStartedAt: number | null;
  startFast: () => void;
  /** Termine le jeûne et renvoie sa durée en heures */
  endFast: () => number;
  fastingHistory: FastEntry[];
}

export interface FastEntry {
  date: string;
  hours: number;
  goal: number;
}

const STORAGE_KEY = 'roadtobaki_app_v5';
const LEGACY_STORAGE_KEY = 'roadtobaki_app_v4';

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
  return (
    <ActivityProvider>
      <AppProviderInner>{children}</AppProviderInner>
    </ActivityProvider>
  );
}

function AppProviderInner({ children }: { children: React.ReactNode }) {
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [fastingMode, setFastingModeState] = useState<FastingMode>('none');
  const [douleurs, setDouleursState] = useState<Douleur[] | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [trainingUnlockedDay, setTrainingUnlockedDay] = useState(1);
  const [fastingStartedAt, setFastingStartedAt] = useState<number | null>(null);
  const [fastingHistory, setFastingHistory] = useState<FastEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { waterIntakeByDate, addWater, stepsByDate, setSteps, trainingDoneDates, setTrainingDoneForDate } = useActivity();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as {
        weightHistory?: WeightEntry[];
        fastingMode?: FastingMode;
        douleurs?: Douleur[] | null;
        isPremium?: boolean;
        trainingUnlockedDay?: number;
        fastingStartedAt?: number | null;
        fastingHistory?: FastEntry[];
      };
      if (Array.isArray(parsed.weightHistory)) setWeightHistory(parsed.weightHistory);
      if (parsed.fastingMode) setFastingModeState(parsed.fastingMode);
      if (Array.isArray(parsed.douleurs)) setDouleursState(parsed.douleurs);
      if (typeof parsed.isPremium === 'boolean') setIsPremium(parsed.isPremium);
      if (typeof parsed.trainingUnlockedDay === 'number') {
        setTrainingUnlockedDay(Math.min(5, Math.max(1, Math.round(parsed.trainingUnlockedDay))));
      }
      if (typeof parsed.fastingStartedAt === 'number') setFastingStartedAt(parsed.fastingStartedAt);
      if (Array.isArray(parsed.fastingHistory)) setFastingHistory(parsed.fastingHistory);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          weightHistory,
          fastingMode,
          douleurs,
          isPremium,
          trainingUnlockedDay,
          fastingStartedAt,
          fastingHistory,
        }),
      );
    } catch {
      // ignore
    }
  }, [loaded, weightHistory, fastingMode, douleurs, isPremium, trainingUnlockedDay, fastingStartedAt, fastingHistory]);

  const startFast = useCallback(() => setFastingStartedAt(Date.now()), []);
  const endFast = useCallback(() => {
    if (!fastingStartedAt) return 0;
    const hours = Math.round(((Date.now() - fastingStartedAt) / 3_600_000) * 10) / 10;
    const goal = FASTING_PLANS_UI[fastingMode].hoursFast || 16;
    if (hours >= 0.1) setFastingHistory((prev) => [...prev, { date: todayISO(), hours, goal }].slice(-120));
    setFastingStartedAt(null);
    return hours;
  }, [fastingStartedAt, fastingMode]);

  const addWeight = useCallback((weight: number) => {
    const w = Math.round(weight * 10) / 10;
    if (w < 30 || w > 300) return;
    const today = todayISO();
    setWeightHistory((prev) => {
      const filtered = prev.filter(
        (e) => e.date !== today && e.weight >= 30 && e.weight <= 300,
      );
      return [...filtered, { date: today, weight: w }].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });
  }, []);

  const setFastingMode = useCallback((mode: FastingMode) => {
    setFastingModeState(mode);
  }, []);

  const setDouleurs = useCallback((d: Douleur[] | null) => {
    setDouleursState(d);
  }, []);

  const setPremium = useCallback((v: boolean) => setIsPremium(v), []);
  const unlockTrainingDay = useCallback((day: number) => {
    const safe = Math.min(5, Math.max(1, Math.round(day)));
    setTrainingUnlockedDay((prev) => (safe > prev ? safe : prev));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      loaded,
      isPremium,
      setPremium,
      weightHistory,
      addWeight,
      waterIntakeByDate,
      addWater,
      stepsByDate,
      setSteps,
      fastingMode,
      setFastingMode,
      trainingDoneDates,
      setTrainingDoneForDate,
      trainingUnlockedDay,
      unlockTrainingDay,
      douleurs,
      setDouleurs,
      fastingStartedAt,
      startFast,
      endFast,
      fastingHistory,
    }),
    [
      loaded,
      fastingStartedAt,
      startFast,
      endFast,
      fastingHistory,
      isPremium,
      setPremium,
      weightHistory,
      addWeight,
      waterIntakeByDate,
      addWater,
      stepsByDate,
      setSteps,
      fastingMode,
      setFastingMode,
      trainingDoneDates,
      setTrainingDoneForDate,
      trainingUnlockedDay,
      unlockTrainingDay,
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

