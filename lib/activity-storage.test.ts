import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_STORAGE_KEY,
  LEGACY_ACTIVITY_STORAGE_KEY,
  emptyActivity,
  mergeImportedSteps,
  readActivity,
  writeActivity,
} from './activity-storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const SAVED = { waterIntakeByDate: { '2026-11-03': 1500 }, stepsByDate: { '2026-11-03': 8421 }, trainingDoneDates: ['2026-11-03'] };

describe('activity storage', () => {
  it('relit la copie enregistrée', () => {
    const storage = memoryStorage({ [ACTIVITY_STORAGE_KEY]: JSON.stringify(SAVED) });
    expect(readActivity(storage)).toEqual(SAVED);
  });

  it("reprend l'ancienne clé si la nouvelle n'existe pas", () => {
    const storage = memoryStorage({ [LEGACY_ACTIVITY_STORAGE_KEY]: JSON.stringify(SAVED) });
    expect(readActivity(storage)?.stepsByDate).toEqual({ '2026-11-03': 8421 });
  });

  it('ignore les données illisibles ou mal typées', () => {
    expect(readActivity(memoryStorage({ [ACTIVITY_STORAGE_KEY]: '{oops' }))).toBeNull();
    expect(readActivity(memoryStorage())).toBeNull();
    const weird = memoryStorage({ [ACTIVITY_STORAGE_KEY]: JSON.stringify({ stepsByDate: { a: 'x', b: 12 }, trainingDoneDates: [1, 'd'] }) });
    expect(readActivity(weird)).toEqual({ waterIntakeByDate: {}, stepsByDate: { b: 12 }, trainingDoneDates: ['d'] });
  });

  it("n'écrase pas les données tant qu'elles n'ont pas été lues (double montage StrictMode)", () => {
    const storage = memoryStorage({ [ACTIVITY_STORAGE_KEY]: JSON.stringify(SAVED) });
    // 1er montage : effet de sauvegarde avec l'état initial vide, avant la lecture
    expect(writeActivity(storage, emptyActivity(), false)).toBe(false);
    // 2e montage (StrictMode) : la relecture doit encore trouver les données
    expect(readActivity(storage)).toEqual(SAVED);
    // Après lecture, la sauvegarde fonctionne normalement
    expect(writeActivity(storage, { ...SAVED, stepsByDate: { '2026-11-03': 9000 } }, true)).toBe(true);
    expect(readActivity(storage)?.stepsByDate).toEqual({ '2026-11-03': 9000 });
  });

  it('fusionne les pas importés en gardant le plus grand total', () => {
    const current = { '2026-11-02': 12000, '2026-11-03': 3000 };
    const merged = mergeImportedSteps(current, { '2026-11-02': 9500, '2026-11-03': 6100.4, '2026-11-04': 800, nope: 5 });
    expect(merged).toEqual({ '2026-11-02': 12000, '2026-11-03': 6100, '2026-11-04': 800 });
    expect(mergeImportedSteps(current, { '2026-11-02': 100 })).toBe(current);
  });
});
