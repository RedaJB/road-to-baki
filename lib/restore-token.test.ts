import { describe, expect, it } from 'vitest';
import { accessCustomer, checkOtp, createAccess, createOtp, OTP_TTL_MS, rateLimiter, sign, verify } from './restore-token';

const SECRET = 'x'.repeat(40);
const OTHER = 'y'.repeat(40);

describe('restore-token', () => {
  it('le bon code est accepté, un mauvais est refusé', () => {
    const { code, token } = createOtp(SECRET, ' Moi@Exemple.fr ');
    expect(code).toMatch(/^\d{6}$/);
    expect(checkOtp(SECRET, token, code)?.e).toBe('moi@exemple.fr');
    const wrong = code === '000000' ? '000001' : '000000';
    expect(checkOtp(SECRET, token, wrong)).toBeNull();
    expect(checkOtp(SECRET, token, 'abcdef')).toBeNull();
  });

  it('le code n’apparaît pas en clair dans le jeton', () => {
    const { code, token } = createOtp(SECRET, 'moi@exemple.fr');
    const body = Buffer.from(token.split('.')[0], 'base64url').toString('utf8');
    expect(body).not.toContain(code);
  });

  it('le code expire après 10 minutes', () => {
    const now = 1_000_000;
    const { code, token } = createOtp(SECRET, 'moi@exemple.fr', now);
    expect(checkOtp(SECRET, token, code, now + OTP_TTL_MS - 1)).not.toBeNull();
    expect(checkOtp(SECRET, token, code, now + OTP_TTL_MS + 1)).toBeNull();
  });

  it('un jeton signé avec une autre clé ou modifié est refusé', () => {
    const t = createAccess(SECRET, 'cus_123');
    expect(accessCustomer(SECRET, t)).toBe('cus_123');
    expect(accessCustomer(OTHER, t)).toBeNull();
    const [, sig] = t.split('.');
    const forged = `${Buffer.from(JSON.stringify({ k: 'access', c: 'cus_victime', exp: Date.now() + 1e9 })).toString('base64url')}.${sig}`;
    expect(accessCustomer(SECRET, forged)).toBeNull();
    expect(accessCustomer(SECRET, 'cus_123')).toBeNull();
    expect(accessCustomer(SECRET, undefined)).toBeNull();
  });

  it('un jeton de code ne sert pas de jeton d’accès (et inversement)', () => {
    const { token } = createOtp(SECRET, 'moi@exemple.fr');
    expect(accessCustomer(SECRET, token)).toBeNull();
    expect(verify(SECRET, createAccess(SECRET, 'cus_1'), 'otp')).toBeNull();
    expect(accessCustomer(SECRET, sign(SECRET, { k: 'access', c: 'pas_un_client', exp: Date.now() + 1000 }))).toBeNull();
  });

  it('le limiteur bloque au-delà du maximum puis se réinitialise', () => {
    const limit = rateLimiter(2, 1000);
    expect(limit('a', 0)).toBe(false);
    expect(limit('a', 1)).toBe(false);
    expect(limit('a', 2)).toBe(true);
    expect(limit('b', 2)).toBe(false);
    expect(limit('a', 2000)).toBe(false);
  });
});
