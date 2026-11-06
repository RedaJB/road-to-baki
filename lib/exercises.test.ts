import { describe, expect, it } from 'vitest';
import { getExercisesForDay } from './exercises';

describe('exercises', () => {
  it('retourne des exercices pour un jour valide', () => {
    const list = getExercisesForDay({ objectif: 'prise', day: 1 });
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('id');
  });

  it('retourne une liste vide si le jour est invalide', () => {
    const list = getExercisesForDay({ objectif: 'perte', day: 99 });
    expect(list).toEqual([]);
  });

  it('remplace certains exercices selon douleurs', () => {
    const noPain = getExercisesForDay({ objectif: 'prise', day: 1, douleurs: null });
    const withPain = getExercisesForDay({ objectif: 'prise', day: 1, douleurs: ['dos'] });
    const noPainIds = noPain.map((e) => e.id);
    const withPainIds = withPain.map((e) => e.id);
    expect(noPainIds).toContain('souleve_terre');
    expect(withPainIds).toContain('hip_thrust');
    expect(withPainIds).not.toContain('souleve_terre');
  });
});
