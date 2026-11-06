/** Données santé importées d'un appareil, par jour (date locale YYYY-MM-DD). Partagé client / serveur. */

export interface HealthDay {
  steps?: number;
  /** calories dépensées sur la journée (métabolisme de base + activité) */
  kcal?: number;
  /** fréquence cardiaque moyenne */
  hrAvg?: number;
  /** minutes de sommeil de la nuit qui se termine ce jour-là */
  sleepMin?: number;
}

export type HealthDays = Record<string, HealthDay>;

/** Codes d'erreur renvoyés par /api/health/google/* */
export type HealthErrorCode =
  | 'not_configured'
  | 'bad_request'
  | 'rate_limited'
  | 'reconnect'
  | 'not_linked'
  | 'scope'
  | 'denied'
  | 'upstream';

export const MAX_SYNC_DAYS = 30;

export const isISODate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** Décale une date YYYY-MM-DD d'un nombre de jours (calendrier, sans fuseau) */
export function shiftISODate(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Pas par jour, prêts pour stepsByDate */
export function stepsFromDays(days: HealthDays): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [date, d] of Object.entries(days)) if (typeof d.steps === 'number') out[date] = d.steps;
  return out;
}
