import { describe, expect, it } from 'vitest';
import { powerRank } from './power-rank';

describe('rang de puissance', () => {
  it('commence au rang E', () => {
    const r = powerRank({ sessions: 0, bestStreak: 0, volumeKg: 0, records: 0 });
    expect(r.rank).toBe('E');
    expect(r.next?.rank).toBe('D');
    expect(r.pct).toBe(0);
  });

  it('monte avec les séances et la régularité', () => {
    expect(powerRank({ sessions: 6, bestStreak: 0, volumeKg: 0, records: 0 }).rank).toBe('D');
    expect(powerRank({ sessions: 20, bestStreak: 7, volumeKg: 30_000, records: 6 }).rank).toBe('B');
  });

  it('plafonne au rang S', () => {
    const r = powerRank({ sessions: 120, bestStreak: 30, volumeKg: 500_000, records: 20 });
    expect(r.rank).toBe('S');
    expect(r.next).toBeNull();
    expect(r.pct).toBe(1);
  });
});
