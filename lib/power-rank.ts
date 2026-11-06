/**
 * Rang de puissance façon manga (E → S) : régularité + travail accumulé.
 * Calcul pur, sans état : affiché dans le Dojo.
 */
export type PowerRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export const RANKS: { rank: PowerRank; at: number; label: string; kanji: string }[] = [
  { rank: 'E', at: 0, label: 'Débutant', kanji: '初' },
  { rank: 'D', at: 60, label: 'Apprenti', kanji: '弟' },
  { rank: 'C', at: 180, label: 'Combattant', kanji: '闘' },
  { rank: 'B', at: 400, label: 'Guerrier', kanji: '武' },
  { rank: 'A', at: 800, label: 'Élite', kanji: '鬼' },
  { rank: 'S', at: 1500, label: 'Monstre', kanji: '神' },
];

export interface PowerStats {
  sessions: number;
  bestStreak: number;
  volumeKg: number;
  records: number;
}

export function powerScore(s: PowerStats) {
  return Math.round(s.sessions * 10 + s.bestStreak * 15 + Math.min(s.volumeKg / 1000, 50) * 4 + s.records * 5);
}

export function powerRank(s: PowerStats) {
  const score = powerScore(s);
  let i = 0;
  while (i + 1 < RANKS.length && score >= RANKS[i + 1].at) i++;
  const next = RANKS[i + 1] ?? null;
  const pct = next ? (score - RANKS[i].at) / (next.at - RANKS[i].at) : 1;
  return { ...RANKS[i], score, next, pct };
}
