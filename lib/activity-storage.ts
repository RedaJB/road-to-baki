/** Lecture / écriture des données d'activité (eau, pas, jours d'entraînement) dans le stockage local. */

export const ACTIVITY_STORAGE_KEY = 'roadtobaki_activity_v1';
export const LEGACY_ACTIVITY_STORAGE_KEY = 'roadtobaki_app_v4';

export interface ActivitySnapshot {
  waterIntakeByDate: Record<string, number>;
  stepsByDate: Record<string, number>;
  trainingDoneDates: string[];
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function emptyActivity(): ActivitySnapshot {
  return { waterIntakeByDate: {}, stepsByDate: {}, trainingDoneDates: [] };
}

function numberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/** Lit la copie enregistrée (ou l'ancienne clé). Renvoie null s'il n'y a rien d'exploitable. */
export function readActivity(storage: ReadableStorage): ActivitySnapshot | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(ACTIVITY_STORAGE_KEY) ?? storage.getItem(LEGACY_ACTIVITY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof ActivitySnapshot, unknown>> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      waterIntakeByDate: numberRecord(parsed.waterIntakeByDate),
      stepsByDate: numberRecord(parsed.stepsByDate),
      trainingDoneDates: Array.isArray(parsed.trainingDoneDates)
        ? parsed.trainingDoneDates.filter((d): d is string => typeof d === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Enregistre l'état, mais seulement une fois la copie existante lue (`loaded`).
 * Sans cette garde, le premier rendu (état vide) écrase les données, ce qui les efface
 * pour de bon quand React monte deux fois le composant (StrictMode en dev).
 */
export function writeActivity(storage: WritableStorage, snapshot: ActivitySnapshot, loaded: boolean): boolean {
  if (!loaded) return false;
  try {
    storage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

/**
 * Fusionne des pas importés d'un appareil : on garde le plus grand des deux nombres pour chaque jour,
 * pour qu'une synchro ne fasse jamais baisser un total saisi à la main.
 */
export function mergeImportedSteps(current: Record<string, number>, imported: Record<string, number>): Record<string, number> {
  let changed = false;
  const next = { ...current };
  for (const [date, value] of Object.entries(imported)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof value !== 'number' || !Number.isFinite(value)) continue;
    const steps = Math.max(0, Math.round(value));
    if (steps > (next[date] ?? 0)) {
      next[date] = steps;
      changed = true;
    }
  }
  return changed ? next : current;
}
