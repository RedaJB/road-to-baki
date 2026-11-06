/** Côté téléphone : lien Google Health enregistré, retour de connexion et appels de synchro. */

import { MAX_SYNC_DAYS, type HealthDays, type HealthErrorCode } from './health-days';

export const HEALTH_STORAGE_KEY = 'roadtobaki_health_v1';
export const HEALTH_PENDING_KEY = 'roadtobaki_health_pending';
const PENDING_TTL_MS = 15 * 60_000;

export type HealthStatus = 'ok' | 'reconnect' | 'not_linked' | 'error';

export interface StoredHealth {
  provider: 'google';
  /** jeton chiffré par le serveur (illisible sans HEALTH_LINK_SECRET) */
  link: string;
  connectedAt: number;
  lastSyncAt: number | null;
  status: HealthStatus;
  /** dernières valeurs connues, par jour (7 jours max gardés) */
  recent: HealthDays;
}

export function readStoredHealth(storage: Pick<Storage, 'getItem'>): StoredHealth | null {
  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredHealth>;
    if (p.provider !== 'google' || typeof p.link !== 'string' || !p.link) return null;
    return {
      provider: 'google',
      link: p.link,
      connectedAt: typeof p.connectedAt === 'number' ? p.connectedAt : Date.now(),
      lastSyncAt: typeof p.lastSyncAt === 'number' ? p.lastSyncAt : null,
      status: p.status === 'reconnect' || p.status === 'not_linked' || p.status === 'error' ? p.status : 'ok',
      recent: p.recent && typeof p.recent === 'object' ? p.recent : {},
    };
  } catch {
    return null;
  }
}

/* ─── Connexion ─── */

function randomNonce(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ouvre l'écran d'autorisation Google (la page quitte l'appli puis y revient) */
export function beginGoogleConnect() {
  const nonce = randomNonce();
  try {
    window.localStorage.setItem(HEALTH_PENDING_KEY, JSON.stringify({ nonce, at: Date.now() }));
  } catch {
    // sans stockage, le retour sera refusé : rien d'autre à faire
  }
  window.location.assign(`/api/health/google/start?nonce=${nonce}`);
}

export type RedirectResult = { kind: 'ok'; link: string } | { kind: 'error'; reason: HealthErrorCode };

/**
 * Lit le résultat laissé dans le fragment (#health=…) par /api/health/google/callback.
 * Un lien n'est accepté que s'il répond à une connexion lancée depuis ce téléphone (même nonce, < 15 min).
 */
export function parseRedirect(hash: string, pending: { nonce?: unknown; at?: unknown } | null, now = Date.now()): RedirectResult | null {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const health = q.get('health');
  if (health !== 'ok' && health !== 'error') return null;
  if (health === 'error') return { kind: 'error', reason: (q.get('reason') as HealthErrorCode) || 'upstream' };
  const nonce = pending && typeof pending.nonce === 'string' && typeof pending.at === 'number' && now - pending.at < PENDING_TTL_MS ? pending.nonce : null;
  const link = q.get('link');
  if (!nonce || q.get('n') !== nonce || !link) return { kind: 'error', reason: 'bad_request' };
  return { kind: 'ok', link };
}

export const HEALTH_ERROR_TEXT: Record<HealthErrorCode, string> = {
  not_configured: 'La connexion Google Health n’est pas encore activée.',
  bad_request: 'Connexion interrompue. Relance-la depuis l’appli.',
  rate_limited: 'Trop de tentatives. Réessaie dans quelques minutes.',
  reconnect: 'Autorisation Google expirée. Reconnecte Google Health.',
  not_linked: 'Ouvre d’abord l’appli Google Health et connecte-toi avec ce compte Google.',
  scope: 'Autorise l’accès à l’activité pour importer tes pas.',
  denied: 'Connexion annulée.',
  upstream: 'Google Health ne répond pas. Réessaie plus tard.',
};

/* ─── Synchro ─── */

/** Jours à relire : tout le mois au premier passage, sinon depuis la dernière synchro (+2 j pour les montres en retard) */
export function syncSpan(lastSyncAt: number | null, now = Date.now()): number {
  if (!lastSyncAt) return MAX_SYNC_DAYS;
  const days = Math.ceil((now - lastSyncAt) / 86_400_000) + 2;
  return Math.max(3, Math.min(MAX_SYNC_DAYS, days));
}

export type SyncResponse = { ok: true; days: HealthDays; link?: string } | { ok: false; code: HealthErrorCode };

export async function requestSync(link: string, to: string, days: number): Promise<SyncResponse> {
  try {
    const res = await fetch('/api/health/google/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link, to, days }),
    });
    const json = (await res.json().catch(() => ({}))) as { days?: HealthDays; link?: string; code?: HealthErrorCode };
    if (!res.ok || !json.days) return { ok: false, code: json.code ?? 'upstream' };
    return { ok: true, days: json.days, link: json.link };
  } catch {
    return { ok: false, code: 'upstream' };
  }
}

/** Garde les 7 jours les plus récents pour l'affichage */
export function keepRecent(prev: HealthDays, incoming: HealthDays, today: string): HealthDays {
  const merged: HealthDays = { ...prev };
  for (const [date, d] of Object.entries(incoming)) merged[date] = { ...merged[date], ...d };
  const dates = Object.keys(merged)
    .filter((d) => d <= today)
    .sort()
    .slice(-7);
  return Object.fromEntries(dates.map((d) => [d, merged[d]]));
}
