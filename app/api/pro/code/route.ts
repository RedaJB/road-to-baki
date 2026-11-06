import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Accès Pro avec le code secret du propriétaire (PRO_ACCESS_CODE, plusieurs codes séparés par des virgules) */
const hits = new Map<string, { n: number; reset: number }>();

function tooMany(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 10 * 60_000 });
    return false;
  }
  h.n += 1;
  return h.n > 8;
}

const digest = (s: string) => createHash('sha256').update(s.trim()).digest();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (tooMany(ip)) return NextResponse.json({ error: 'Trop d’essais, réessaie dans 10 minutes.' }, { status: 429 });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const codes = (process.env.PRO_ACCESS_CODE ?? '').split(',').map((c) => c.trim()).filter((c) => c.length >= 8);
  if (!code || !codes.length) return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
  const given = digest(code);
  const ok = codes.some((c) => timingSafeEqual(digest(c), given));
  if (!ok) return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
