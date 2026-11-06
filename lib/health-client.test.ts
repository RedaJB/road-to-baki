import { describe, expect, it } from 'vitest';
import { keepRecent, parseRedirect, readStoredHealth, syncSpan, HEALTH_STORAGE_KEY } from './health-client';
import { shiftISODate, stepsFromDays } from './health-days';

const NOW = 1_800_000_000_000;

describe('retour de connexion', () => {
  const pending = { nonce: 'n0nce0n0nce0n0nce0', at: NOW - 60_000 };

  it('accepte le lien quand le nonce correspond', () => {
    expect(parseRedirect(`#health=ok&link=g1.a.b&n=${pending.nonce}`, pending, NOW)).toEqual({ kind: 'ok', link: 'g1.a.b' });
  });

  it('refuse un lien qui ne vient pas de ce téléphone ou trop ancien', () => {
    expect(parseRedirect('#health=ok&link=g1.a.b&n=autre', pending, NOW)).toEqual({ kind: 'error', reason: 'bad_request' });
    expect(parseRedirect(`#health=ok&link=g1.a.b&n=${pending.nonce}`, null, NOW)).toEqual({ kind: 'error', reason: 'bad_request' });
    expect(parseRedirect(`#health=ok&link=g1.a.b&n=${pending.nonce}`, { ...pending, at: NOW - 3_600_000 }, NOW)).toEqual({ kind: 'error', reason: 'bad_request' });
  });

  it('remonte les erreurs et ignore les autres fragments', () => {
    expect(parseRedirect('#health=error&reason=not_linked&n=x', pending, NOW)).toEqual({ kind: 'error', reason: 'not_linked' });
    expect(parseRedirect('#autre=1', pending, NOW)).toBeNull();
    expect(parseRedirect('', pending, NOW)).toBeNull();
  });
});

describe('synchro côté téléphone', () => {
  it('relit un mois la première fois, puis depuis la dernière synchro', () => {
    expect(syncSpan(null, NOW)).toBe(30);
    expect(syncSpan(NOW - 3_600_000, NOW)).toBe(3);
    expect(syncSpan(NOW - 5 * 86_400_000, NOW)).toBe(7);
    expect(syncSpan(NOW - 90 * 86_400_000, NOW)).toBe(30);
  });

  it('garde les 7 derniers jours pour l’affichage', () => {
    const today = '2026-11-04';
    const incoming = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [shiftISODate(today, -i), { steps: i }]));
    const recent = keepRecent({ [today]: { kcal: 2100 } }, incoming, today);
    expect(Object.keys(recent)).toHaveLength(7);
    expect(recent[today]).toEqual({ kcal: 2100, steps: 0 });
    expect(recent[shiftISODate(today, -7)]).toBeUndefined();
  });

  it('extrait les pas par jour', () => {
    expect(stepsFromDays({ '2026-11-03': { steps: 8000, kcal: 2000 }, '2026-11-04': { kcal: 900 } })).toEqual({ '2026-11-03': 8000 });
  });

  it('relit un enregistrement valide et ignore le reste', () => {
    const storage = (v: string | null) => ({ getItem: (k: string) => (k === HEALTH_STORAGE_KEY ? v : null) });
    expect(readStoredHealth(storage(null))).toBeNull();
    expect(readStoredHealth(storage('{bad'))).toBeNull();
    expect(readStoredHealth(storage(JSON.stringify({ provider: 'google', link: 'g1.a.b', connectedAt: 1, lastSyncAt: 2, status: 'reconnect', recent: {} })))).toMatchObject({
      link: 'g1.a.b',
      status: 'reconnect',
      lastSyncAt: 2,
    });
  });
});
