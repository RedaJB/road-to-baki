import { NextResponse } from 'next/server';
import { notConfigured, stripe } from '../../../../lib/stripe-server';
import { mailerConfigured, sendRestoreCode } from '../../../../lib/mailer';
import { clientIp, createOtp, normalizeEmail, rateLimiter, restoreNotConfigured, restoreSecret } from '../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

const perIp = rateLimiter(10, 10 * 60_000);
const perEmail = rateLimiter(3, 10 * 60_000);

/**
 * Étape 1 de la restauration : envoie un code à 6 chiffres à l'e-mail du paiement.
 * Réponse identique que l'e-mail soit abonné ou non (pas de fuite d'information).
 */
export async function POST(req: Request) {
  const s = stripe();
  if (!s) return notConfigured();
  const secret = restoreSecret();
  if (!secret) return restoreNotConfigured();
  if (!mailerConfigured()) return NextResponse.json({ error: 'Envoi d’e-mail non configuré : ajoute RESEND_API_KEY et RESEND_FROM dans .env' }, { status: 503 });
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return NextResponse.json({ error: 'E-mail invalide' }, { status: 400 });
  const e = normalizeEmail(email);
  if (perIp(clientIp(req)) || perEmail(e)) return NextResponse.json({ error: 'Trop de demandes, réessaie dans 10 minutes.' }, { status: 429 });
  const { code, token } = createOtp(secret, e);
  try {
    const customers = await s.customers.list({ email: e, limit: 1 });
    if (customers.data.length) await sendRestoreCode(e, code);
  } catch {
    return NextResponse.json({ error: 'Impossible d’envoyer le code pour le moment. Réessaie plus tard.' }, { status: 502 });
  }
  return NextResponse.json({ challenge: token });
}
