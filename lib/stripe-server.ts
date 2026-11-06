import Stripe from 'stripe';
import { NextResponse } from 'next/server';

/** Client Stripe (null si STRIPE_SECRET_KEY absent) */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function notConfigured() {
  return NextResponse.json({ error: 'Paiement non configuré : ajoute STRIPE_SECRET_KEY et les prix dans .env' }, { status: 503 });
}

export function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || new URL(req.url).origin;
}

export interface ProStatus {
  active: boolean;
  status: string | null;
  plan: 'monthly' | 'yearly' | null;
  periodEnd: number | null;
  trialEnd: number | null;
  customerId: string | null;
}

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

export function planOf(priceId: string | undefined): 'monthly' | 'yearly' | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return 'yearly';
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return 'monthly';
  return null;
}

/** Statut Pro d'un client Stripe (meilleur abonnement en cours) */
export async function statusForCustomer(s: Stripe, customerId: string): Promise<ProStatus> {
  const subs = await s.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
  const live = subs.data.find((x) => ACTIVE.has(x.status)) ?? null;
  if (!live) return { active: false, status: subs.data[0]?.status ?? null, plan: null, periodEnd: null, trialEnd: null, customerId };
  const item = live.items.data[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const periodEnd = item?.current_period_end ?? (live as unknown as { current_period_end?: number }).current_period_end ?? null;
  return {
    active: true,
    status: live.status,
    plan: planOf(item?.price.id),
    periodEnd,
    trialEnd: live.trial_end ?? null,
    customerId,
  };
}
