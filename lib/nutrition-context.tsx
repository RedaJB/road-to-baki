'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type MealType = 'petit_dej' | 'dej' | 'diner' | 'snack';

export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: MealType;
  label: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface NutritionState {
  meals: MealEntry[];
  addMeal: (input: Omit<MealEntry, 'id'>) => void;
  updateMeal: (id: string, input: Partial<Omit<MealEntry, 'id'>>) => void;
  removeMeal: (id: string) => void;
  getMealsForDate: (date: string) => MealEntry[];
  getTotalCaloriesForDate: (date: string) => number;
  getTotalProteinForDate: (date: string) => number;
  getTotalCarbsForDate: (date: string) => number;
  getTotalFatForDate: (date: string) => number;
}

const STORAGE_KEY = 'roadtobaki_meals_v1';

const NutritionContext = createContext<NutritionState | undefined>(undefined);

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<MealEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MealEntry[];
      if (Array.isArray(parsed)) {
        setMeals(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
    } catch {
      // ignore
    }
  }, [meals]);

  const addMeal = useCallback((input: Omit<MealEntry, 'id'>) => {
    setMeals((prev) => [
      ...prev,
      {
        ...input,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
    ]);
  }, []);

  const updateMeal = useCallback((id: string, input: Partial<Omit<MealEntry, 'id'>>) => {
    setMeals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...input } : m))
    );
  }, []);

  const removeMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const getMealsForDate = useCallback(
    (date: string) => meals.filter((m) => m.date === date),
    [meals],
  );

  const getTotalCaloriesForDate = useCallback(
    (date: string) =>
      getMealsForDate(date).reduce((sum, m) => sum + (m.calories || 0), 0),
    [getMealsForDate],
  );

  const getTotalProteinForDate = useCallback(
    (date: string) =>
      getMealsForDate(date).reduce((sum, m) => sum + (m.protein ?? 0), 0),
    [getMealsForDate],
  );

  const getTotalCarbsForDate = useCallback(
    (date: string) =>
      getMealsForDate(date).reduce((sum, m) => sum + (m.carbs ?? 0), 0),
    [getMealsForDate],
  );

  const getTotalFatForDate = useCallback(
    (date: string) =>
      getMealsForDate(date).reduce((sum, m) => sum + (m.fat ?? 0), 0),
    [getMealsForDate],
  );

  const value = useMemo<NutritionState>(
    () => ({
      meals,
      addMeal,
      updateMeal,
      removeMeal,
      getMealsForDate,
      getTotalCaloriesForDate,
      getTotalProteinForDate,
      getTotalCarbsForDate,
      getTotalFatForDate,
    }),
    [meals, addMeal, updateMeal, removeMeal, getMealsForDate, getTotalCaloriesForDate, getTotalProteinForDate, getTotalCarbsForDate, getTotalFatForDate],
  );

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const ctx = useContext(NutritionContext);
  if (!ctx) {
    throw new Error('useNutrition must be used within NutritionProvider');
  }
  return ctx;
}

