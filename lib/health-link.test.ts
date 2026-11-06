import { describe, expect, it } from 'vitest';
import { STATE_TTL_MS, openLink, sealLink, signState, verifyState } from './health-link';

const SECRET = 'x'.repeat(40);
const OTHER = 'y'.repeat(40);
const NONCE = 'a1b2c3d4e5f6a1b2c3d4e5f6';

describe('state OAuth', () => {
  it('renvoie le nonce si le state est intact et frais', () => {
    expect(verifyState(SECRET, signState(SECRET, NONCE))).toBe(NONCE);
  });

  it('refuse un state expiré, falsifié ou signé avec une autre clé', () => {
    const now = Date.now();
    const state = signState(SECRET, NONCE, now);
    expect(verifyState(SECRET, state, now + STATE_TTL_MS + 1)).toBeNull();
    expect(verifyState(OTHER, state)).toBeNull();
    const [body, sig] = state.split('.');
    const forged = Buffer.from(JSON.stringify({ n: 'zzzzzzzzzzzzzzzzzzzz', exp: now + 1e9 })).toString('base64url');
    expect(verifyState(SECRET, `${forged}.${sig}`)).toBeNull();
    expect(verifyState(SECRET, `${body}.${sig}.x`)).toBeNull();
    expect(verifyState(SECRET, null)).toBeNull();
  });
});

describe('lien chiffré', () => {
  const link = { rt: '1//refresh-token', sc: 'scope-a scope-b', iat: 1_700_000_000_000 };

  it('chiffre et déchiffre sans laisser le jeton en clair', () => {
    const sealed = sealLink(SECRET, link);
    expect(sealed.startsWith('g1.')).toBe(true);
    expect(sealed).not.toContain('refresh');
    expect(openLink(SECRET, sealed)).toEqual(link);
    expect(sealLink(SECRET, link)).not.toBe(sealed); // IV aléatoire
  });

  it('refuse un lien modifié ou chiffré avec une autre clé', () => {
    const sealed = sealLink(SECRET, link);
    expect(openLink(OTHER, sealed)).toBeNull();
    const last = sealed.slice(-2, -1) === 'A' ? 'B' : 'A';
    expect(openLink(SECRET, `${sealed.slice(0, -2)}${last}${sealed.slice(-1)}`)).toBeNull();
    expect(openLink(SECRET, 'g1.abc')).toBeNull();
    expect(openLink(SECRET, 42)).toBeNull();
  });
});
