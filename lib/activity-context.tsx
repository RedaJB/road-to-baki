'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mergeImportedSteps, readActivity, writeActivity } from './activity-storage';

interface ActivityState {
  waterIntakeByDate: Record<string, number>;
  addWater: (date: string, ml: number) => void;
  stepsByDate: Record<string, number>;
  setSteps: (date: string, steps: number) => void;
  /** Pas importés d'un appareil (date → pas) : garde le plus grand total pour chaque jour. */
  importSteps: (byDate: Record<string, number>) => void;
  trainingDoneDates: string[];
  setTrainingDoneForDate: (date: string, done: boolean) => void;
}

const ActivityContext = createContext<ActivityState | undefined>(undefined);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [waterIntakeByDate, setWaterIntakeByDate] = useState<Record<string, number>>({});
  const [stepsByDate, setStepsByDate] = useState<Record<string, number>>({});
  const [trainingDoneDates, setTrainingDoneDates] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = readActivity(window.localStorage);
    if (saved) {
      setWaterIntakeByDate(saved.waterIntakeByDate);
      setStepsByDate(saved.stepsByDate);
      setTrainingDoneDates(saved.trainingDoneDates);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    writeActivity(window.localStorage, { waterIntakeByDate, stepsByDate, trainingDoneDates }, loaded);
  }, [loaded, waterIntakeByDate, stepsByDate, trainingDoneDates]);

  const setSteps = useCallback((date: string, steps: number) => {
    setStepsByDate((prev) => ({ ...prev, [date]: Math.max(0, Math.round(steps)) }));
  }, []);

  const importSteps = useCallback((byDate: Record<string, number>) => {
    setStepsByDate((prev) => mergeImportedSteps(prev, byDate));
  }, []);

  const addWater = useCallback((date: string, ml: number) => {
    setWaterIntakeByDate((prev) => ({
      ...prev,
      [date]: Math.max(0, (prev[date] ?? 0) + ml),
    }));
  }, []);

  const setTrainingDoneForDate = useCallback((date: string, done: boolean) => {
    setTrainingDoneDates((prev) => {
      if (done) return prev.includes(date) ? prev : [...prev, date];
      return prev.filter((d) => d !== date);
    });
  }, []);

  const value = useMemo<ActivityState>(
    () => ({
      waterIntakeByDate,
      addWater,
      stepsByDate,
      setSteps,
      importSteps,
      trainingDoneDates,
      setTrainingDoneForDate,
    }),
    [waterIntakeByDate, addWater, stepsByDate, setSteps, importSteps, trainingDoneDates, setTrainingDoneForDate],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return ctx;
}
