import { describe, expect, it } from 'vitest';
import { BOUTEILLE_ML, VERRE_ML, getRecommendedWaterMl } from './water';

describe('water', () => {
  it('retourne le minimum si poids trop faible', () => {
    expect(getRecommendedWaterMl(25)).toBe(1500);
  });

  it('ajoute un bonus au-dessus de 170cm', () => {
    const withoutBonus = getRecommendedWaterMl(70, 170);
    const withBonus = getRecommendedWaterMl(70, 180);
    expect(withBonus).toBeGreaterThan(withoutBonus);
  });

  it('respecte les bornes min/max', () => {
    expect(getRecommendedWaterMl(500)).toBe(4000);
    expect(getRecommendedWaterMl(30)).toBeGreaterThanOrEqual(1500);
  });

  it('expose des constantes de volume stables', () => {
    expect(VERRE_ML).toBe(250);
    expect(BOUTEILLE_ML).toBe(1500);
  });
});
