/** Calcul du besoin en eau (ml/jour) selon poids et taille - formules standards */

const ML_PER_KG = 35; // ~35 ml par kg (recommandation OMS / nutrition)
const TAILLE_BONUS_PER_CM = 2; // bonus si > 170 cm
const MIN_ML = 1500;
const MAX_ML = 4000;

export function getRecommendedWaterMl(weightKg: number, heightCm?: number): number {
  if (!weightKg || weightKg < 30) return MIN_ML;
  let ml = Math.round(weightKg * ML_PER_KG);
  if (heightCm && heightCm > 170) {
    ml += Math.round((heightCm - 170) * TAILLE_BONUS_PER_CM);
  }
  return Math.min(MAX_ML, Math.max(MIN_ML, ml));
}

export const VERRE_ML = 250;
export const BOUTEILLE_ML = 1500;
