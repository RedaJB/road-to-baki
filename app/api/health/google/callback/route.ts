import { GoogleHealthError, STEPS_SCOPE, checkIdentity, exchangeCode, googleHealthConfig, redirectUri, revokeToken } from '../../../../../lib/google-health';
import { sealLink, verifyState } from '../../../../../lib/health-link';
import type { HealthErrorCode } from '../../../../../lib/health-days';
import { clientIp, rateLimiter } from '../../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

const perIp = rateLimiter(20, 10 * 60_000);

/** Retour vers l'appli : le résultat voyage dans le fragment (#…), jamais envoyé à un serveur */
function backToApp(req: Request, params: Record<string, string>) {
  const url = new URL('/app', req.url);
  url.hash = new URLSearchParams(params).toString();
  return new Response(null, { status: 303, headers: { Location: url.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

/**
 * Étape 2 : Google renvoie ici avec un code à usage unique.
 * On l'échange contre un jeton de rafraîchissement, qu'on chiffre et qu'on rend au téléphone.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const fail = (reason: HealthErrorCode, nonce = '') => backToApp(req, { health: 'error', reason, n: nonce });

  const cfg = googleHealthConfig();
  if (!cfg) return fail('not_configured');
  if (perIp(clientIp(req))) return fail('rate_limited');

  const nonce = verifyState(cfg.secret, q.get('state'));
  if (!nonce) return fail('bad_request');
  if (q.get('error')) return fail('denied', nonce);

  const code = q.get('code');
  if (!code) return fail('bad_request', nonce);

  try {
    const token = await exchangeCode(cfg, code, redirectUri(req));
    const granted = (token.scope ?? '').split(' ');
    if (!token.refresh_token || !granted.includes(STEPS_SCOPE)) {
      if (token.refresh_token) await revokeToken(token.refresh_token);
      return fail('scope', nonce);
    }
    try {
      await checkIdentity(token.access_token as string);
    } catch (e) {
      if (e instanceof GoogleHealthError && e.code === 'not_linked') {
        await revokeToken(token.refresh_token);
        return fail('not_linked', nonce);
      }
      // autre souci passager : la première synchro dira si ça marche
    }
    const link = sealLink(cfg.secret, { rt: token.refresh_token, sc: token.scope ?? '', iat: Date.now() });
    return backToApp(req, { health: 'ok', link, n: nonce });
  } catch (e) {
    return fail(e instanceof GoogleHealthError ? e.code : 'upstream', nonce);
  }
}
