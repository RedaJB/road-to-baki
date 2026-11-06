import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GOOGLE_HEALTH_SCOPES, STEPS_SCOPE, civilDateKey, parseDailyRollUp, parseSleep } from './google-health';
import { openLink, sealLink } from './health-link';
import { GET as start } from '../app/api/health/google/start/route';
import { GET as callback } from '../app/api/health/google/callback/route';
import { POST as sync } from '../app/api/health/google/sync/route';
import { POST as disconnect } from '../app/api/health/google/disconnect/route';
import { GET as status } from '../app/api/health/google/status/route';

const SECRET = 's'.repeat(48);
const NONCE = 'f00df00df00df00df00df00d';
const ORIGIN = 'http://localhost:3124';
const d = (year: number, month: number, day: number) => ({ date: { year, month, day } });

/* ─── Faux Google ─── */

type Call = { url: string; body: string };
let calls: Call[] = [];

function googleFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const body = typeof init?.body === 'string' ? init.body : '';
  calls.push({ url, body });
  const auth = new Headers(init?.headers).get('Authorization');
  const json = (data: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status }));

  if (url === 'https://oauth2.googleapis.com/token') {
    const p = new URLSearchParams(body);
    if (p.get('grant_type') === 'authorization_code') {
      if (p.get('code') === 'good') return json({ access_token: 'at-ok', refresh_token: 'rt-ok', scope: GOOGLE_HEALTH_SCOPES.join(' ') });
      if (p.get('code') === 'unlinked') return json({ access_token: 'at-unlinked', refresh_token: 'rt-unlinked', scope: GOOGLE_HEALTH_SCOPES.join(' ') });
      if (p.get('code') === 'no-steps') return json({ access_token: 'at-x', refresh_token: 'rt-x', scope: GOOGLE_HEALTH_SCOPES[2] });
      return json({ error: 'invalid_grant' }, 400);
    }
    if (p.get('refresh_token') === 'rt-ok') return json({ access_token: 'at-ok', scope: GOOGLE_HEALTH_SCOPES.join(' ') });
    return json({ error: 'invalid_grant' }, 400);
  }
  if (url.startsWith('https://oauth2.googleapis.com/revoke')) return json({});
  if (url.endsWith('/identity')) {
    if (auth === 'Bearer at-unlinked') return Promise.resolve(new Response('{"error":{"code":400,"details":[{"reason":"ACCOUNT_NOT_LINKED"}]}}', { status: 400 }));
    return json({ healthUserId: '123' });
  }
  if (url.includes('/dataTypes/steps/dataPoints:dailyRollUp')) {
    return json({
      rollupDataPoints: [
        { civilStartTime: d(2026, 11, 3), steps: { countSum: '8421' } },
        { civilStartTime: d(2026, 11, 4), steps: { countSum: '1200' } },
        { civilStartTime: d(2026, 11, 2) }, // montre pas portée
      ],
    });
  }
  if (url.includes('/dataTypes/total-calories/dataPoints:dailyRollUp')) {
    return json({ rollupDataPoints: [{ civilStartTime: d(2026, 11, 3), totalCalories: { kcalSum: 2310.6 } }] });
  }
  if (url.includes('/dataTypes/heart-rate/dataPoints:dailyRollUp')) return json({ error: { code: 403, status: 'PERMISSION_DENIED' } }, 403);
  if (url.includes('/dataTypes/sleep/dataPoints')) {
    return json({
      dataPoints: [
        { sleep: { interval: { civilEndTime: d(2026, 11, 4) }, summary: { minutesAsleep: '432' }, metadata: { nap: false } } },
        { sleep: { interval: { civilEndTime: d(2026, 11, 4) }, summary: { minutesAsleep: 30 }, metadata: { nap: true } } },
      ],
    });
  }
  return json({ error: 'not found' }, 404);
}

beforeEach(() => {
  calls = [];
  vi.stubEnv('GOOGLE_HEALTH_CLIENT_ID', 'client-id.apps.googleusercontent.com');
  vi.stubEnv('GOOGLE_HEALTH_CLIENT_SECRET', 'client-secret');
  vi.stubEnv('HEALTH_LINK_SECRET', SECRET);
  vi.stubEnv('GOOGLE_HEALTH_REDIRECT_URI', '');
  vi.stubGlobal('fetch', vi.fn(googleFetch));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const fragment = (res: Response) => new URLSearchParams(new URL(res.headers.get('Location') ?? '').hash.slice(1));
const post = (path: string, body: unknown) => new Request(`${ORIGIN}${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

describe('lecture des réponses Google Health', () => {
  it('convertit les dates civiles', () => {
    expect(civilDateKey(d(2026, 1, 5))).toBe('2026-01-05');
    expect(civilDateKey({})).toBeNull();
  });

  it('lit les totaux journaliers et ignore les jours vides', () => {
    const json = { rollupDataPoints: [{ civilStartTime: d(2026, 11, 3), steps: { countSum: '8421' } }, { civilStartTime: d(2026, 11, 2) }, { steps: { countSum: '5' } }] };
    expect(parseDailyRollUp(json, 'steps', 'countSum')).toEqual({ '2026-11-03': 8421 });
    expect(parseDailyRollUp(null, 'steps', 'countSum')).toEqual({});
  });

  it('additionne le sommeil par jour de réveil, sans les siestes', () => {
    const json = {
      dataPoints: [
        { sleep: { interval: { civilEndTime: d(2026, 11, 4) }, summary: { minutesAsleep: 400 } } },
        { sleep: { interval: { civilEndTime: d(2026, 11, 4) }, summary: { minutesAsleep: 20 } } },
        { sleep: { interval: { civilEndTime: d(2026, 11, 4) }, summary: { minutesAsleep: 45 }, metadata: { nap: true } } },
      ],
    };
    expect(parseSleep(json)).toEqual({ '2026-11-04': 420 });
  });
});

describe('routes /api/health/google', () => {
  it('signale si les clés manquent', async () => {
    expect(await (status().json() as Promise<unknown>)).toEqual({ configured: true });
    vi.stubEnv('GOOGLE_HEALTH_CLIENT_SECRET', '');
    expect(await (status().json() as Promise<unknown>)).toEqual({ configured: false });
    const res = start(new Request(`${ORIGIN}/api/health/google/start?nonce=${NONCE}`));
    expect(res.status).toBe(503);
  });

  it('envoie vers l’écran d’autorisation Google', () => {
    const res = start(new Request(`${ORIGIN}/api/health/google/start?nonce=${NONCE}`));
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get('Location') ?? '');
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/health/google/callback`);
    expect(url.searchParams.get('scope')?.split(' ')).toEqual(GOOGLE_HEALTH_SCOPES);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(start(new Request(`${ORIGIN}/api/health/google/start?nonce=court`)).status).toBe(400);
  });

  async function connect(code: string, nonce = NONCE) {
    const startRes = start(new Request(`${ORIGIN}/api/health/google/start?nonce=${nonce}`));
    const state = new URL(startRes.headers.get('Location') ?? '').searchParams.get('state') ?? '';
    return callback(new Request(`${ORIGIN}/api/health/google/callback?code=${code}&state=${encodeURIComponent(state)}`));
  }

  it('rend un lien chiffré à l’appli après autorisation', async () => {
    const res = await connect('good');
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')?.startsWith(`${ORIGIN}/app#`)).toBe(true);
    const f = fragment(res);
    expect(f.get('health')).toBe('ok');
    expect(f.get('n')).toBe(NONCE);
    expect(openLink(SECRET, f.get('link'))?.rt).toBe('rt-ok');
    expect(res.headers.get('Location')).not.toContain('rt-ok');
  });

  it('refuse un retour sans state valide, annulé ou sans accès aux pas', async () => {
    const bad = await callback(new Request(`${ORIGIN}/api/health/google/callback?code=good&state=faux`));
    expect(fragment(bad).get('reason')).toBe('bad_request');

    const startRes = start(new Request(`${ORIGIN}/api/health/google/start?nonce=${NONCE}`));
    const state = new URL(startRes.headers.get('Location') ?? '').searchParams.get('state') ?? '';
    const denied = await callback(new Request(`${ORIGIN}/api/health/google/callback?error=access_denied&state=${encodeURIComponent(state)}`));
    expect(Object.fromEntries(fragment(denied))).toEqual({ health: 'error', reason: 'denied', n: NONCE });

    const noSteps = await connect('no-steps');
    expect(fragment(noSteps).get('reason')).toBe('scope');
    expect(calls.some((c) => c.url.includes('/revoke') && c.body.includes('rt-x'))).toBe(true);
    expect(STEPS_SCOPE).toContain('activity_and_fitness');
  });

  it('demande d’ouvrir Google Health si le compte n’y est pas relié', async () => {
    const res = await connect('unlinked');
    expect(fragment(res).get('reason')).toBe('not_linked');
  });

  it('synchronise les pas et les extras disponibles', async () => {
    const link = sealLink(SECRET, { rt: 'rt-ok', sc: GOOGLE_HEALTH_SCOPES.join(' '), iat: 1 });
    const res = await sync(post('/api/health/google/sync', { link, to: '2026-11-04', days: 30 }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { days: Record<string, unknown>; link?: string };
    expect(json.days).toEqual({
      '2026-11-03': { steps: 8421, kcal: 2311 },
      '2026-11-04': { steps: 1200, sleepMin: 432 },
    });
    expect(json.link).toBeUndefined();
    const stepsCall = calls.find((c) => c.url.includes('/steps/'));
    expect(JSON.parse(stepsCall?.body ?? '{}')).toMatchObject({
      range: { start: { date: { year: 2026, month: 10, day: 6 } }, end: { date: { year: 2026, month: 11, day: 5 } } },
      windowSizeDays: 1,
    });
    const kcalCall = calls.find((c) => c.url.includes('/total-calories/'));
    expect(JSON.parse(kcalCall?.body ?? '{}').range.start.date).toEqual({ year: 2026, month: 10, day: 29 });
  });

  it('demande de se reconnecter si Google a retiré l’accès', async () => {
    const dead = sealLink(SECRET, { rt: 'rt-dead', sc: '', iat: 1 });
    const res = await sync(post('/api/health/google/sync', { link: dead, to: '2026-11-04', days: 3 }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code: string }).code).toBe('reconnect');
    const forged = await sync(post('/api/health/google/sync', { link: 'g1.xx.yy', to: '2026-11-04' }));
    expect(forged.status).toBe(401);
    const badDate = await sync(post('/api/health/google/sync', { link: dead, to: 'hier' }));
    expect(badDate.status).toBe(400);
  });

  it('révoque l’accès à la déconnexion', async () => {
    const link = sealLink(SECRET, { rt: 'rt-ok', sc: '', iat: 1 });
    const res = await disconnect(post('/api/health/google/disconnect', { link }));
    expect(await res.json()).toEqual({ ok: true, revoked: true });
    expect(calls.some((c) => c.url.includes('/revoke') && c.body === 'token=rt-ok')).toBe(true);
  });
});
