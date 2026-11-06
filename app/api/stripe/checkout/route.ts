import { NextResponse } from 'next/server';
import { appUrl, notConfigured, stripe } from '../../../../lib/stripe-server';

export const dynamic = 'force-dynamic';

/** Crée une session de paiement Stripe (abonnement + essai gratuit) */
export async function POST(req: Request) {
  const s = stripe();
  if (!s) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as { plan?: 'monthly' | 'yearly'; email?: string };
  const price = body.plan === 'monthly' ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_YEARLY;
  if (!price) return NextResponse.json({ error: 'Prix Stripe manquant (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY)' }, { status: 503 });
  const trial = Number(process.env.STRIPE_TRIAL_DAYS ?? 7);
  const base = appUrl(req);
  try {
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      subscription_data: trial > 0 ? { trial_period_days: trial } : undefined,
      customer_email: body.email || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'fr',
      success_url: `${base}/app?pro=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/app?pro=cancel`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
