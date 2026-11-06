import { NextResponse } from 'next/server';
import { notConfigured, statusForCustomer, stripe } from '../../../../lib/stripe-server';
import { createAccess, restoreNotConfigured, restoreSecret } from '../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

/** Vérifie une session de paiement au retour de Stripe et délivre le jeton d'accès */
export async function GET(req: Request) {
  const s = stripe();
  if (!s) return notConfigured();
  const secret = restoreSecret();
  if (!secret) return restoreNotConfigured();
  const id = new URL(req.url).searchParams.get('id');
  if (!id || !id.startsWith('cs_')) return NextResponse.json({ error: 'Session invalide' }, { status: 400 });
  try {
    const session = await s.checkout.sessions.retrieve(id);
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    // seul un paiement terminé prouve qu'on est le client
    if (!customerId || session.status !== 'complete') return NextResponse.json({ active: false, customerId: null, token: null });
    return NextResponse.json({ ...(await statusForCustomer(s, customerId)), token: createAccess(secret, customerId) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
