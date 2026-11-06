import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  checkWarriorDay,
  computeRollingStreak,
  computeTrainingStreak,
} from './streak';

describe('streak', () => {
  it('addDaysISO décale correctement', () => {
    expect(addDaysISO('2026-05-11', -1)).toBe('2026-05-10');
    expect(addDaysISO('2026-05-11', 1)).toBe('2026-05-12');
  });

  it('computeTrainingStreak compte les jours consécutifs', () => {
    expect(computeTrainingStreak(['2026-05-11', '2026-05-10'], '2026-05-11')).toBe(2);
    expect(computeTrainingStreak(['2026-05-11'], '2026-05-11')).toBe(1);
    expect(computeTrainingStreak(['2026-05-09'], '2026-05-11')).toBe(0);
  });

  it('computeRollingStreak accepte hier si aujourd hui incomplet', () => {
    const today = '2026-05-11';
    const set = new Set(['2026-05-10', '2026-05-09']);
    const streak = computeRollingStreak((d) => set.has(d), today);
    expect(streak).toBe(2);
  });

  it('checkWarriorDay agrège les trois piliers', () => {
    const base = {
      date: '2026-05-11',
      calorieGoal: 2000,
      waterGoalMl: 2000,
      steps: 7000,
    };
    const ok = checkWarriorDay({
      ...base,
      totalKcal: 800,
      waterMl: 1900,
      trainingDone: false,
    });
    expect(ok.foodOk).toBe(true);
    expect(ok.waterOk).toBe(true);
    expect(ok.moveOk).toBe(true);
    expect(ok.complete).toBe(true);

    const bad = checkWarriorDay({
      ...base,
      totalKcal: 100,
      waterMl: 100,
      trainingDone: false,
      steps: 100,
    });
    expect(bad.complete).toBe(false);
  });
});
