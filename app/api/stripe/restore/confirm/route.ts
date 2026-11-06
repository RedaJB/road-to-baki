import { NextResponse } from 'next/server';
import { notConfigured, statusForCustomer, stripe } from '../../../../../lib/stripe-server';
import { checkOtp, clientIp, createAccess, rateLimiter, restoreNotConfigured, restoreSecret, verify } from '../../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

const perIp = rateLimiter(15, 10 * 60_000);
/** 5 essais par code envoyé */
const perCode = rateLimiter(5, 15 * 60_000);

/** Étape 2 de la restauration : vérifie le code reçu par e-mail puis renvoie le statut + un jeton d'accès */
export async function POST(req: Request) {
  const s = stripe();
  if (!s) return notConfigured();
  const secret = restoreSecret();
  if (!secret) return restoreNotConfigured();
  const { challenge, code } = (await req.json().catch(() => ({}))) as { challenge?: string; code?: string };
  const pending = verify(secret, challenge, 'otp');
  if (!pending) return NextResponse.json({ error: 'Code expiré. Demande un nouveau code.' }, { status: 400 });
  if (perIp(clientIp(req)) || perCode(pending.n)) return NextResponse.json({ error: 'Trop d’essais. Demande un nouveau code.' }, { status: 429 });
  const ok = checkOtp(secret, challenge, code);
  if (!ok) return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
  try {
    const customers = await s.customers.list({ email: ok.e, limit: 5 });
    for (const c of customers.data) {
      const st = await statusForCustomer(s, c.id);
      if (st.active) return NextResponse.json({ ...st, token: createAccess(secret, c.id) });
    }
    const first = customers.data[0]?.id ?? null;
    return NextResponse.json({ active: false, customerId: first, token: first ? createAccess(secret, first) : null, status: null, plan: null, periodEnd: null, trialEnd: null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
