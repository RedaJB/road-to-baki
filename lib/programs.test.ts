import { describe, expect, it } from 'vitest';
import { EXERCISES, PLAN_ID, blockWeek, buildPlan, buildSession, resolveExerciseId, scheduleFor, sessionXp, suggestWeight, type PlanInput } from './programs';

const GOALS = ['prendre_muscle', 'recomposition', 'maigrir', 'forme'] as const;
const PLACES = ['salle', 'maison'] as const;
const ALL: PlanInput[] = GOALS.flatMap((goal) => PLACES.map((location) => ({ goal, location })));

describe('programme personnalisé', () => {
  it('chaque exercice de chaque version existe dans la banque, ainsi que ses variantes', () => {
    for (const input of ALL) {
      const p = buildPlan(input);
      for (const d of [...p.days2, ...p.days3, ...p.days, p.extra]) {
        for (const e of d.exercises) {
          expect(EXERCISES[e.id], `${input.goal}/${input.location}/${d.name}/${e.id}`).toBeDefined();
          expect(e.max ?? e.reps, `${e.id} fourchette`).toBeGreaterThanOrEqual(e.reps);
        }
      }
    }
    for (const ex of Object.values(EXERCISES)) {
      if (ex.homeAlt) expect(EXERCISES[ex.homeAlt], `${ex.id}.homeAlt`).toBeDefined();
      for (const alt of Object.values(ex.painAlt ?? {})) expect(EXERCISES[alt!], `${ex.id}.painAlt`).toBeDefined();
    }
  });

  it('s’adapte à l’objectif et au lieu', () => {
    expect(buildPlan({ goal: 'prendre_muscle', location: 'salle', frequency: 4 }).tagline).toBe('Prise de muscle · 4 séances / semaine · Salle');
    const seche = buildPlan({ goal: 'maigrir', location: 'salle' }).days3.map((d) => d.name);
    const muscle = buildPlan({ goal: 'prendre_muscle', location: 'salle' }).days3.map((d) => d.name);
    expect(seche).not.toEqual(muscle);
    expect(buildPlan({}).id).toBe(PLAN_ID);
  });

  it('à la maison, aucun exercice ne demande de matériel', () => {
    for (const goal of GOALS) {
      const p = buildPlan({ goal, location: 'maison' });
      scheduleFor(p, 5).forEach((_, i) => {
        for (const e of buildSession(p, i, { location: 'maison', frequency: 5 })) {
          expect(EXERCISES[e.id].equip, `${goal} J${i + 1} ${e.id}`).toContain('aucun');
          expect(e.weighted).toBe(false);
        }
      });
    }
  });

  it('remplace le soulevé de terre en cas de douleur au dos', () => {
    expect(resolveExerciseId('souleve_terre', { douleurs: ['dos'] })).not.toBe('souleve_terre');
    const p = buildPlan({ goal: 'maigrir', location: 'salle' });
    const s = buildSession(p, 1, { douleurs: ['dos'], frequency: 3 });
    expect(s.map((e) => e.id)).not.toContain('souleve_terre');
    expect(s.some((e) => e.swapped)).toBe(true);
  });

  it('adapte le volume au niveau', () => {
    const p = buildPlan({ goal: 'prendre_muscle', location: 'salle' });
    const deb = buildSession(p, 0, { experience: 'debutant' });
    const av = buildSession(p, 0, { experience: 'avance' });
    expect(deb[0].sets).toBeLessThan(av[0].sets);
  });

  it('fait tourner les séances et l’XP croît avec le travail', () => {
    const p = buildPlan({ goal: 'forme', location: 'salle' });
    expect(buildSession(p, p.days3.length, {})[0].id).toBe(buildSession(p, 0, {})[0].id);
    expect(sessionXp(20, 20)).toBeGreaterThan(sessionXp(5, 20));
  });

  it('la version du programme suit la fréquence choisie', () => {
    for (const input of ALL) {
      const p = buildPlan(input);
      expect(scheduleFor(p, 1)).toHaveLength(2);
      expect(scheduleFor(p, 2)).toHaveLength(2);
      expect(scheduleFor(p, 3)).toHaveLength(3);
      expect(scheduleFor(p, 4)).toHaveLength(4);
      expect(scheduleFor(p, 6)).toHaveLength(5);
    }
  });

  it('chaque séance a un mouvement principal et un volume raisonnable', () => {
    for (const input of ALL) {
      const p = buildPlan(input);
      for (const d of [...p.days2, ...p.days3, ...p.days, p.extra]) {
        expect(d.exercises.some((e) => e.main), `${input.goal}/${d.name}`).toBe(true);
        expect(d.exercises.length, `${input.goal}/${d.name}`).toBeGreaterThanOrEqual(4);
        expect(d.exercises.length, `${input.goal}/${d.name}`).toBeLessThanOrEqual(7);
      }
    }
  });

  it('progresse par blocs de 4 semaines avec une semaine allégée', () => {
    expect(blockWeek(0, 3).week).toBe(1);
    expect(blockWeek(3, 3).week).toBe(2);
    expect(blockWeek(11, 3).week).toBe(4);
    expect(blockWeek(12, 3)).toMatchObject({ week: 1, cycle: 1 });
    const p = buildPlan({ goal: 'prendre_muscle', location: 'salle' });
    const w1 = buildSession(p, 0, { frequency: 3, sessionsDone: 0 });
    const w2 = buildSession(p, 0, { frequency: 3, sessionsDone: 3 });
    const w3 = buildSession(p, 0, { frequency: 3, sessionsDone: 6 });
    const w4 = buildSession(p, 0, { frequency: 3, sessionsDone: 9 });
    expect(w2[0].sets).toBeGreaterThan(w1[0].sets);
    expect(w3[1].reps).toBeGreaterThan(w1[1].reps);
    expect(w4[0].sets).toBeLessThan(w1[0].sets);
    expect(w3[0].rir).toBeLessThan(w1[0].rir);
  });

  it('au poids du corps, les reps montent d’un bloc à l’autre', () => {
    const p = buildPlan({ goal: 'prendre_muscle', location: 'maison' });
    const bloc1 = buildSession(p, 0, { frequency: 3, sessionsDone: 0, location: 'maison' });
    const bloc3 = buildSession(p, 0, { frequency: 3, sessionsDone: 24, location: 'maison' });
    expect(bloc3[0].reps).toBeGreaterThan(bloc1[0].reps);
  });

  it('conseille +2,5 kg quand le haut de la fourchette est atteint partout', () => {
    expect(suggestWeight([{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }], 10)).toBe(62.5);
    expect(suggestWeight([{ reps: 10, weight: 60 }, { reps: 8, weight: 60 }], 10)).toBe(60);
    expect(suggestWeight([{ reps: 12, weight: 8 }], 12)).toBe(9);
    expect(suggestWeight(undefined, 10)).toBeUndefined();
  });
});
