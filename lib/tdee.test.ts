import { describe, expect, it } from 'vitest';
import { getBMR, getCalorieGoal, getTDEE } from './tdee';

describe('tdee', () => {
  it('calcule le BMR homme avec Mifflin-St Jeor', () => {
    expect(getBMR('homme', 80, 180, 30)).toBe(1780);
  });

  it('retourne un fallback sur valeurs invalides', () => {
    expect(getBMR('femme', 0, 165, 28)).toBe(1500);
  });

  it('calcule le TDEE avec multiplicateur activite', () => {
    expect(getTDEE('homme', 80, 180, 30, 'actif')).toBe(2759);
  });

  it('applique un deficit pour objectif de perte', () => {
    expect(
      getCalorieGoal({
        sexe: 'homme',
        poidsKg: 90,
        tailleCm: 180,
        age: 32,
        activite: 'actif',
        poidsCible: 80,
      })
    ).toBeLessThan(getTDEE('homme', 90, 180, 32, 'actif'));
  });
});
