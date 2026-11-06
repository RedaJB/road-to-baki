import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Jetons signés (HMAC-SHA256, clé RESTORE_SECRET) : pas de base de données.
 * - « otp » : code à 6 chiffres envoyé par e-mail, en attente de confirmation (10 min)
 * - « access » : preuve qu'on contrôle un client Stripe (e-mail vérifié ou paiement terminé)
 */

export const OTP_TTL_MS = 10 * 60_000;
export const ACCESS_TTL_MS = 180 * 24 * 3600_000;

export interface OtpPayload {
  k: 'otp';
  /** e-mail normalisé */
  e: string;
  /** identifiant unique du code (limite d'essais) */
  n: string;
  /** HMAC du code : le code lui-même n'est jamais dans le jeton */
  h: string;
  exp: number;
}

export interface AccessPayload {
  k: 'access';
  /** client Stripe (cus_…) */
  c: string;
  exp: number;
}

type Payload = OtpPayload | AccessPayload;

/** Clé de signature (null si absente ou trop courte) */
export function restoreSecret(): string | null {
  const s = process.env.RESTORE_SECRET ?? '';
  return s.length >= 32 ? s : null;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const mac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest();

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sign(secret: string, payload: Payload): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(mac(secret, `rtb1.${body}`))}`;
}

export function verify<K extends Payload['k']>(secret: string, token: unknown, kind: K, now = Date.now()): Extract<Payload, { k: K }> | null {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  if (!safeEqual(Buffer.from(sig, 'base64url'), mac(secret, `rtb1.${body}`))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Payload;
    if (p.k !== kind || typeof p.exp !== 'number' || p.exp < now) return null;
    return p as Extract<Payload, { k: K }>;
  } catch {
    return null;
  }
}

const codeMac = (secret: string, nonce: string, email: string, code: string) => b64(mac(secret, `otp|${nonce}|${email}|${code}`));

/** Nouveau code à 6 chiffres + jeton qui permettra de le vérifier */
export function createOtp(secret: string, email: string, now = Date.now()) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const e = normalizeEmail(email);
  const n = b64(randomBytes(12));
  const token = sign(secret, { k: 'otp', e, n, h: codeMac(secret, n, e, code), exp: now + OTP_TTL_MS });
  return { code, token };
}

/** Vérifie le code saisi ; renvoie le jeton décodé si le code est bon */
export function checkOtp(secret: string, token: unknown, code: unknown, now = Date.now()): OtpPayload | null {
  const p = verify(secret, token, 'otp', now);
  if (!p || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) return null;
  const ok = safeEqual(Buffer.from(codeMac(secret, p.n, p.e, code.trim())), Buffer.from(p.h));
  return ok ? p : null;
}

export function createAccess(secret: string, customerId: string, now = Date.now()) {
  return sign(secret, { k: 'access', c: customerId, exp: now + ACCESS_TTL_MS });
}

/** Client Stripe prouvé par le jeton d'accès, sinon null */
export function accessCustomer(secret: string, token: unknown, now = Date.now()): string | null {
  const p = verify(secret, token, 'access', now);
  return p && typeof p.c === 'string' && p.c.startsWith('cus_') ? p.c : null;
}

/** Limiteur en mémoire (par instance serveur) */
export function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string, now = Date.now()) => {
    const h = hits.get(key);
    if (!h || h.reset < now) {
      if (hits.size > 5000) hits.forEach((v, k) => v.reset < now && hits.delete(k));
      hits.set(key, { n: 1, reset: now + windowMs });
      return false;
    }
    h.n += 1;
    return h.n > max;
  };
}

export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export function restoreNotConfigured() {
  return Response.json({ error: 'Restauration non configurée : ajoute RESTORE_SECRET (32 caractères minimum) dans .env' }, { status: 503 });
}
