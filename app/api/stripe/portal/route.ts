import { NextResponse } from 'next/server';
import { appUrl, notConfigured, stripe } from '../../../../lib/stripe-server';
import { accessCustomer, restoreNotConfigured, restoreSecret } from '../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

/** Ouvre l'espace client Stripe (changer de formule, résilier, factures) : jeton d'accès signé obligatoire */
export async function POST(req: Request) {
  const s = stripe();
  if (!s) return notConfigured();
  const secret = restoreSecret();
  if (!secret) return restoreNotConfigured();
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const customerId = accessCustomer(secret, token);
  if (!customerId) return NextResponse.json({ error: 'Session expirée. Restaure ton abonnement pour gérer ton compte.' }, { status: 401 });
  try {
    const portal = await s.billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl(req)}/app` });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
