/**
 * Calcul TDEE (Total Daily Energy Expenditure) et objectif calorique
 * Formule Mifflin-St Jeor
 */

export type Activite = 'sedentaire' | 'actif' | 'tres_actif';

const MULTIPLIERS: Record<Activite, number> = {
  sedentaire: 1.2,
  actif: 1.55,
  tres_actif: 1.725,
};

/**
 * BMR (Basal Metabolic Rate) - Mifflin-St Jeor
 */
export function getBMR(sexe: 'homme' | 'femme', poidsKg: number, tailleCm: number, age: number): number {
  if (poidsKg <= 0 || tailleCm <= 0) return 1500;
  if (sexe === 'homme') {
    return 10 * poidsKg + 6.25 * tailleCm - 5 * age + 5;
  }
  return 10 * poidsKg + 6.25 * tailleCm - 5 * age - 161;
}

/**
 * TDEE = BMR * multiplicateur d'activité
 */
export function getTDEE(
  sexe: 'homme' | 'femme',
  poidsKg: number,
  tailleCm: number,
  age: number,
  activite: Activite
): number {
  const bmr = getBMR(sexe, poidsKg, tailleCm, age);
  return Math.round(bmr * (MULTIPLIERS[activite] ?? 1.2));
}

/**
 * Objectif calorique selon poids actuel vs cible
 * Perte: TDEE - 500 (~0.5 kg/semaine)
 * Prise: TDEE + 300 (~0.3 kg/semaine)
 */
export function getCalorieGoal(params: {
  sexe: 'homme' | 'femme';
  poidsKg: number;
  tailleCm: number;
  age: number;
  activite: Activite;
  poidsCible?: number | null;
}): number {
  const { sexe, poidsKg, tailleCm, age, activite, poidsCible } = params;
  if (poidsKg < 30 || tailleCm < 100 || age < 10) return 2000;
  const tdee = getTDEE(sexe, poidsKg, tailleCm, age, activite);
  if (!poidsCible || poidsCible === poidsKg) return Math.round(tdee);
  if (poidsCible < poidsKg) return Math.max(1200, Math.round(tdee - 500));
  return Math.round(tdee + 300);
}
