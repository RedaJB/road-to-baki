import { NextResponse } from 'next/server';
import { notConfigured, statusForCustomer, stripe } from '../../../../lib/stripe-server';
import { accessCustomer, createAccess, restoreNotConfigured, restoreSecret } from '../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

/** Statut de l'abonnement du client prouvé par le jeton d'accès (jeton renouvelé au passage) */
export async function POST(req: Request) {
  const s = stripe();
  if (!s) return notConfigured();
  const secret = restoreSecret();
  if (!secret) return restoreNotConfigured();
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const customerId = accessCustomer(secret, token);
  if (!customerId) return NextResponse.json({ error: 'Session expirée. Restaure ton abonnement.' }, { status: 401 });
  try {
    return NextResponse.json({ ...(await statusForCustomer(s, customerId)), token: createAccess(secret, customerId) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
