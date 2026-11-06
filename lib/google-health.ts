import { healthLinkSecret } from './health-link';
import { MAX_SYNC_DAYS, shiftISODate, type HealthDays, type HealthErrorCode } from './health-days';

/**
 * API Google Health (remplaçante de l'API Web Fitbit, coupée le 30 octobre 2026).
 * Elle renvoie les données de l'appli Google Health : montres Fitbit / Pixel Watch, et tout ce qu'elle
 * importe du téléphone via Health Connect (Android) ou Apple Santé (iPhone).
 * Doc : https://developers.google.com/health
 */

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const GOOGLE_HEALTH_API = 'https://health.googleapis.com/v4/users/me';

export const STEPS_SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly';
export const GOOGLE_HEALTH_SCOPES = [
  STEPS_SCOPE, // pas, calories
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly', // fréquence cardiaque
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly', // sommeil
];

/** Jours lus pour les calories, le cardio et le sommeil (les pas vont jusqu'à MAX_SYNC_DAYS) */
const EXTRA_DAYS = 7;
const TIMEOUT_MS = 12_000;

export class GoogleHealthError extends Error {
  constructor(
    public code: HealthErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface GoogleHealthConfig {
  clientId: string;
  clientSecret: string;
  secret: string;
}

export function googleHealthConfig(): GoogleHealthConfig | null {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET?.trim();
  const secret = healthLinkSecret();
  if (!clientId || !clientSecret || !secret) return null;
  return { clientId, clientSecret, secret };
}

/** Adresse de retour OAuth : à déclarer telle quelle dans la console Google Cloud */
export function redirectUri(req: Request): string {
  const fixed = process.env.GOOGLE_HEALTH_REDIRECT_URI?.trim();
  return fixed || `${new URL(req.url).origin}/api/health/google/callback`;
}

export function authorizeUrl(clientId: string, redirect: string, state: string): string {
  const u = new URL(GOOGLE_AUTH_URL);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', GOOGLE_HEALTH_SCOPES.join(' '));
  u.searchParams.set('access_type', 'offline');
  // sans « consent », Google ne renvoie le jeton de rafraîchissement qu'à la toute première connexion
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('state', state);
  return u.toString();
}

/** Réponse d'erreur JSON des routes /api/health/google/* */
export function healthError(code: HealthErrorCode, status: number, error: string) {
  return Response.json({ code, error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorStatus(code: HealthErrorCode): number {
  switch (code) {
    case 'not_configured':
      return 503;
    case 'bad_request':
      return 400;
    case 'rate_limited':
      return 429;
    case 'reconnect':
      return 401;
    case 'not_linked':
      return 409;
    case 'scope':
    case 'denied':
      return 403;
    default:
      return 502;
  }
}

export const NOT_CONFIGURED_MESSAGE =
  'Connexion Google Health non configurée : ajoute GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET et HEALTH_LINK_SECRET (32 caractères minimum) dans .env.local';

/* ─── Appels Google ─── */

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    throw new GoogleHealthError('upstream', 'Google ne répond pas');
  }
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) {
    // invalid_grant : accès retiré, mot de passe changé, ou jeton expiré (7 jours tant que l'appli Google est « en test »)
    if (json.error === 'invalid_grant') throw new GoogleHealthError('reconnect', 'Autorisation Google expirée ou retirée');
    throw new GoogleHealthError('upstream', `Échange de jeton refusé (${json.error ?? res.status})`);
  }
  return json;
}

export function exchangeCode(cfg: GoogleHealthConfig, code: string, redirect: string) {
  return tokenRequest({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' });
}

export function refreshAccessToken(cfg: GoogleHealthConfig, refreshToken: string) {
  return tokenRequest({ refresh_token: refreshToken, client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'refresh_token' });
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => undefined);
}

async function healthFetch(accessToken: string, path: string, init?: { method?: string; body?: unknown }): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${GOOGLE_HEALTH_API}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    throw new GoogleHealthError('upstream', 'Google Health ne répond pas');
  }
  const text = await res.text();
  if (res.ok) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new GoogleHealthError('upstream', 'Réponse Google Health illisible');
    }
  }
  if (text.includes('ACCOUNT_NOT_LINKED')) throw new GoogleHealthError('not_linked', 'Compte Google pas encore relié à l’appli Google Health');
  if (res.status === 401) throw new GoogleHealthError('reconnect', 'Autorisation Google refusée');
  if (res.status === 403) throw new GoogleHealthError('scope', 'Autorisation manquante pour ces données');
  throw new GoogleHealthError('upstream', `Google Health a répondu ${res.status}`);
}

/** Vérifie que le compte Google a bien été ouvert dans l'appli Google Health */
export async function checkIdentity(accessToken: string): Promise<void> {
  await healthFetch(accessToken, '/identity');
}

const civil = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return { date: { year, month, day }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } };
};

/** Totaux par jour d'un type de données, du jour `from` au jour `to` inclus */
export function dailyRollUp(accessToken: string, dataType: string, from: string, to: string, pageSize: number) {
  return healthFetch(accessToken, `/dataTypes/${dataType}/dataPoints:dailyRollUp`, {
    method: 'POST',
    body: { range: { start: civil(from), end: civil(shiftISODate(to, 1)) }, windowSizeDays: 1, pageSize },
  });
}

export function listSleep(accessToken: string, from: string, to: string) {
  const filter = `sleep.interval.civil_end_time >= "${from}" AND sleep.interval.civil_end_time < "${shiftISODate(to, 1)}"`;
  return healthFetch(accessToken, `/dataTypes/sleep/dataPoints?pageSize=25&filter=${encodeURIComponent(filter)}`);
}

/* ─── Lecture des réponses ─── */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/** CivilDateTime Google ({ date: { year, month, day } }) → YYYY-MM-DD */
export function civilDateKey(v: unknown): string | null {
  const d = obj(obj(v)?.date);
  const y = num(d?.year);
  const m = num(d?.month);
  const day = num(d?.day);
  if (!y || !m || !day) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Réponse dailyRollUp → valeur par jour (les jours sans donnée sont absents) */
export function parseDailyRollUp(json: unknown, field: string, valueKey: string): Record<string, number> {
  const out: Record<string, number> = {};
  const points = obj(json)?.rollupDataPoints;
  if (!Array.isArray(points)) return out;
  for (const p of points) {
    const date = civilDateKey(obj(p)?.civilStartTime);
    const value = num(obj(obj(p)?.[field])?.[valueKey]);
    if (date && value !== null && value >= 0) out[date] = value;
  }
  return out;
}

/** Sessions de sommeil → minutes dormies par jour de réveil (siestes exclues) */
export function parseSleep(json: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const points = obj(json)?.dataPoints;
  if (!Array.isArray(points)) return out;
  for (const p of points) {
    const sleep = obj(obj(p)?.sleep);
    if (!sleep || obj(sleep.metadata)?.nap === true) continue;
    const date = civilDateKey(obj(sleep.interval)?.civilEndTime);
    const minutes = num(obj(sleep.summary)?.minutesAsleep);
    if (date && minutes !== null && minutes > 0) out[date] = (out[date] ?? 0) + minutes;
  }
  return out;
}

export function mergeHealthDays(parts: { steps?: Record<string, number>; kcal?: Record<string, number>; hrAvg?: Record<string, number>; sleepMin?: Record<string, number> }): HealthDays {
  const days: HealthDays = {};
  for (const key of ['steps', 'kcal', 'hrAvg', 'sleepMin'] as const) {
    for (const [date, value] of Object.entries(parts[key] ?? {})) {
      days[date] = { ...days[date], [key]: Math.round(value) };
    }
  }
  return days;
}

/* ─── Synchro complète ─── */

export interface SyncResult {
  days: HealthDays;
  /** nouveau jeton de rafraîchissement si Google l'a changé */
  refreshToken?: string;
}

/** Lit les `days` derniers jours jusqu'à `to` (date locale du téléphone) */
export async function syncGoogleHealth(cfg: GoogleHealthConfig, refreshToken: string, to: string, days: number): Promise<SyncResult> {
  const span = Math.max(1, Math.min(MAX_SYNC_DAYS, Math.round(days)));
  const from = shiftISODate(to, -(span - 1));
  const extraFrom = shiftISODate(to, -(Math.min(span, EXTRA_DAYS) - 1));
  const token = await refreshAccessToken(cfg, refreshToken);
  const at = token.access_token as string;

  // optionnels : ignorés si l'autorisation n'a pas été donnée ou si l'appareil ne les mesure pas
  const optional = <T>(p: Promise<T>) => p.catch((e: unknown) => {
    if (e instanceof GoogleHealthError && (e.code === 'reconnect' || e.code === 'not_linked')) throw e;
    return null;
  });

  const [steps, kcal, hr, sleep] = await Promise.all([
    dailyRollUp(at, 'steps', from, to, MAX_SYNC_DAYS),
    optional(dailyRollUp(at, 'total-calories', extraFrom, to, 14)),
    optional(dailyRollUp(at, 'heart-rate', extraFrom, to, 14)),
    optional(listSleep(at, extraFrom, to)),
  ]);

  return {
    days: mergeHealthDays({
      steps: parseDailyRollUp(steps, 'steps', 'countSum'),
      kcal: parseDailyRollUp(kcal, 'totalCalories', 'kcalSum'),
      hrAvg: parseDailyRollUp(hr, 'heartRate', 'beatsPerMinuteAvg'),
      sleepMin: parseSleep(sleep),
    }),
    refreshToken: token.refresh_token && token.refresh_token !== refreshToken ? token.refresh_token : undefined,
  };
}
