/** Abonnement Pro côté appli : mémorisation locale + appels aux routes Stripe */

export interface ProState {
  customerId: string | null;
  /** jeton signé par le serveur : prouve que ce téléphone a payé ou vérifié l'e-mail */
  token: string | null;
  active: boolean;
  plan: 'monthly' | 'yearly' | null;
  periodEnd: number | null;
  trialEnd: number | null;
  /** Pro débloqué avec le code d'accès du propriétaire (pas d'abonnement Stripe) */
  viaCode?: boolean;
  checkedAt: number;
}

const KEY = 'roadtobaki_pro_v1';
const EMPTY: ProState = { customerId: null, token: null, active: false, plan: null, periodEnd: null, trialEnd: null, checkedAt: 0 };

export function readPro(): ProState {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function writePro(p: Partial<ProState>) {
  const next = { ...readPro(), ...p, checkedAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string; notConfigured: boolean; unauthorized: boolean }> {
  try {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? `Erreur ${res.status}`, notConfigured: res.status === 503, unauthorized: res.status === 401 };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Connexion impossible. Vérifie ton réseau.', notConfigured: false, unauthorized: false };
  }
}

type StatusDto = Omit<ProState, 'checkedAt'> & { status?: string | null };

export async function startCheckout(plan: 'monthly' | 'yearly', email?: string) {
  const r = await call<{ url: string }>('/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ plan, email }) });
  if (r.ok && r.data.url) window.location.href = r.data.url;
  return r;
}

export async function verifySession(sessionId: string) {
  const r = await call<StatusDto>(`/api/stripe/session?id=${encodeURIComponent(sessionId)}`);
  if (r.ok) writePro(r.data);
  return r;
}

export async function refreshPro(token: string) {
  const r = await call<StatusDto>('/api/stripe/status', { method: 'POST', body: JSON.stringify({ token }) });
  if (r.ok) writePro(r.data);
  // jeton expiré ou invalide : il faut restaurer l'abonnement par e-mail
  else if (r.unauthorized) writePro({ active: false, token: null, customerId: null });
  return r;
}

/** Restauration, étape 1 : envoie un code à 6 chiffres à l'e-mail du paiement */
export async function requestRestoreCode(email: string) {
  return call<{ challenge: string }>('/api/stripe/restore', { method: 'POST', body: JSON.stringify({ email }) });
}

/** Restauration, étape 2 : vérifie le code reçu et mémorise l'abonnement */
export async function confirmRestoreCode(challenge: string, code: string) {
  const r = await call<StatusDto>('/api/stripe/restore/confirm', { method: 'POST', body: JSON.stringify({ challenge, code }) });
  if (r.ok) writePro(r.data);
  return r;
}

export async function redeemCode(code: string) {
  const r = await call<{ ok: true }>('/api/pro/code', { method: 'POST', body: JSON.stringify({ code }) });
  if (r.ok) writePro({ active: true, viaCode: true });
  return r;
}

export async function openPortal(token: string) {
  const r = await call<{ url: string }>('/api/stripe/portal', { method: 'POST', body: JSON.stringify({ token }) });
  if (r.ok && r.data.url) window.location.href = r.data.url;
  else if (!r.ok && r.unauthorized) writePro({ token: null });
  return r;
}
