'use client';

import { useMemo } from 'react';
import { useOnboarding } from './onboarding-context';
import { useApp } from './app-context';
import { getCalorieGoal } from './tdee';
import { getRecommendedWaterMl } from './water';

/** Objectifs quotidiens calculés depuis le profil (calories, macros, eau, pas) */
export function useGoals() {
  const { answers } = useOnboarding();
  const { weightHistory } = useApp();

  return useMemo(() => {
    const safe = weightHistory.filter((e) => e.weight >= 30 && e.weight <= 300);
    const weight = safe[safe.length - 1]?.weight ?? (answers.poids && answers.poids >= 30 && answers.poids <= 300 ? answers.poids : 70);
    const calories = getCalorieGoal({
      sexe: answers.sexe ?? 'homme',
      poidsKg: weight,
      tailleCm: answers.taille ?? 175,
      age: answers.age ?? 30,
      activite: answers.activite ?? 'sedentaire',
      poidsCible: answers.poidsCible,
    });
    const protein = Math.round((answers.objectifPrincipal === 'prendre_muscle' ? 2 : 1.6) * weight);
    const fat = Math.round((calories * 0.27) / 9);
    const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
    return {
      weight,
      calories,
      protein,
      carbs,
      fat,
      waterMl: getRecommendedWaterMl(weight, answers.taille ?? undefined),
      steps: 10000,
    };
  }, [weightHistory, answers.poids, answers.sexe, answers.taille, answers.age, answers.activite, answers.poidsCible, answers.objectifPrincipal]);
}
