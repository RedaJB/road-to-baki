'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNutrition } from './nutrition-context';
import { useApp } from './app-context';
import { useOnboarding } from './onboarding-context';
import { getCalorieGoal } from './tdee';
import { getRecommendedWaterMl } from './water';
import {
  checkWarriorDay,
  computeRollingStreak,
  computeTrainingStreak,
  todayISO,
  type WarriorDayCheck,
} from './streak';

const META_KEY = 'roadtobaki_streak_meta_v1';

type StreakState = {
  warriorStreak: number;
  trainingStreak: number;
  nutritionStreak: number;
  longestWarrior: number;
  todayWarrior: WarriorDayCheck;
  getWarriorForDate: (date: string) => WarriorDayCheck;
};

const StreakContext = createContext<StreakState | undefined>(undefined);

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { getTotalCaloriesForDate } = useNutrition();
  const { trainingDoneDates, waterIntakeByDate, stepsByDate, weightHistory } = useApp();
  const { answers } = useOnboarding();
  const [longestWarrior, setLongestWarrior] = useState(0);

  const currentWeight = useMemo(() => {
    const safe = weightHistory.filter((e) => e.weight >= 30 && e.weight <= 300);
    return safe[safe.length - 1]?.weight ?? (answers.poids && answers.poids >= 30 && answers.poids <= 300 ? answers.poids : 70);
  }, [weightHistory, answers.poids]);

  const calorieGoal = useMemo(
    () =>
      getCalorieGoal({
        sexe: answers.sexe ?? 'homme',
        poidsKg: currentWeight,
        tailleCm: answers.taille ?? 175,
        age: answers.age ?? 30,
        activite: answers.activite ?? 'sedentaire',
        poidsCible: answers.poidsCible,
      }),
    [answers.sexe, answers.taille, answers.age, answers.activite, answers.poidsCible, currentWeight],
  );

  const waterGoalMl = useMemo(
    () => getRecommendedWaterMl(currentWeight, answers.taille ?? undefined),
    [currentWeight, answers.taille],
  );

  const getWarriorForDate = useMemo(() => {
    return (date: string): WarriorDayCheck => {
      const totalKcal = getTotalCaloriesForDate(date);
      const waterMl = waterIntakeByDate[date] ?? 0;
      const steps = stepsByDate[date] ?? 0;
      const trainingDone = trainingDoneDates.includes(date);
      return checkWarriorDay({
        date,
        totalKcal,
        calorieGoal,
        waterMl,
        waterGoalMl,
        trainingDone,
        steps,
      });
    };
  }, [
    getTotalCaloriesForDate,
    waterIntakeByDate,
    stepsByDate,
    trainingDoneDates,
    calorieGoal,
    waterGoalMl,
  ]);

  const today = todayISO();
  const todayWarrior = getWarriorForDate(today);

  const warriorStreak = useMemo(
    () => computeRollingStreak((d) => getWarriorForDate(d).complete, today),
    [getWarriorForDate, today],
  );

  const trainingStreak = useMemo(
    () => computeTrainingStreak(trainingDoneDates, today),
    [trainingDoneDates, today],
  );

  const nutritionStreak = useMemo(
    () =>
      computeRollingStreak((d) => {
        const g = Math.max(1, calorieGoal);
        return getTotalCaloriesForDate(d) >= g * 0.35;
      }, today),
    [getTotalCaloriesForDate, today, calorieGoal],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(META_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { longestWarrior?: number };
      if (typeof p.longestWarrior === 'number') {
        const lw = p.longestWarrior;
        setLongestWarrior((prev) => Math.max(prev, lw));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setLongestWarrior((prev) => {
      const next = Math.max(prev, warriorStreak);
      if (next > prev && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(META_KEY, JSON.stringify({ longestWarrior: next }));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, [warriorStreak]);

  const value = useMemo<StreakState>(
    () => ({
      warriorStreak,
      trainingStreak,
      nutritionStreak,
      longestWarrior,
      todayWarrior,
      getWarriorForDate,
    }),
    [
      warriorStreak,
      trainingStreak,
      nutritionStreak,
      longestWarrior,
      todayWarrior,
      getWarriorForDate,
    ],
  );

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak must be used within StreakProvider');
  return ctx;
}
