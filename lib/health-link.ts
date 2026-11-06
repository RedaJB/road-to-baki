import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Lien Google Health sans base de données :
 * - le « state » OAuth est signé (HMAC) et expire au bout de 10 minutes ;
 * - le jeton de rafraîchissement Google est chiffré (AES-256-GCM) dans un « lien » que seul
 *   le téléphone garde. Le serveur ne stocke rien et ne peut lire le lien qu'avec HEALTH_LINK_SECRET.
 */

export const STATE_TTL_MS = 10 * 60_000;

/** Clé de chiffrement (null si absente ou trop courte) */
export function healthLinkSecret(): string | null {
  const s = process.env.HEALTH_LINK_SECRET ?? '';
  return s.length >= 32 ? s : null;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(`rtb-health-state|${data}`).digest();
const aesKey = (secret: string) => createHash('sha256').update(`rtb-health-link|${secret}`).digest();

/* ─── State OAuth ─── */

export function isNonce(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(v);
}

export function signState(secret: string, nonce: string, now = Date.now()): string {
  const body = b64(JSON.stringify({ n: nonce, exp: now + STATE_TTL_MS }));
  return `${body}.${b64(hmac(secret, body))}`;
}

/** Renvoie le nonce du navigateur qui a lancé la connexion, ou null si le state est faux ou expiré */
export function verifyState(secret: string, state: unknown, now = Date.now()): string | null {
  if (typeof state !== 'string' || state.length > 512) return null;
  const [body, sig, extra] = state.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const given = Buffer.from(sig, 'base64url');
  const expected = hmac(secret, body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { n?: unknown; exp?: unknown };
    if (typeof p.exp !== 'number' || p.exp < now || !isNonce(p.n)) return null;
    return p.n;
  } catch {
    return null;
  }
}

/* ─── Lien chiffré ─── */

export interface HealthLink {
  /** jeton de rafraîchissement Google */
  rt: string;
  /** autorisations accordées (séparées par des espaces) */
  sc: string;
  /** date de connexion (ms) */
  iat: number;
}

export function sealLink(secret: string, link: HealthLink): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey(secret), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(link), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return `g1.${b64(iv)}.${b64(data)}`;
}

export function openLink(secret: string, sealed: unknown): HealthLink | null {
  if (typeof sealed !== 'string' || sealed.length > 4096) return null;
  const [v, ivPart, dataPart, extra] = sealed.split('.');
  if (v !== 'g1' || !ivPart || !dataPart || extra !== undefined) return null;
  try {
    const iv = Buffer.from(ivPart, 'base64url');
    const data = Buffer.from(dataPart, 'base64url');
    if (iv.length !== 12 || data.length < 17) return null;
    const decipher = createDecipheriv('aes-256-gcm', aesKey(secret), iv);
    decipher.setAuthTag(data.subarray(data.length - 16));
    const json = Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString('utf8');
    const p = JSON.parse(json) as Partial<HealthLink>;
    if (typeof p.rt !== 'string' || !p.rt || typeof p.sc !== 'string' || typeof p.iat !== 'number') return null;
    return { rt: p.rt, sc: p.sc, iat: p.iat };
  } catch {
    return null;
  }
}
