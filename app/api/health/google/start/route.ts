import { NOT_CONFIGURED_MESSAGE, authorizeUrl, googleHealthConfig, healthError, redirectUri } from '../../../../../lib/google-health';
import { isNonce, signState } from '../../../../../lib/health-link';
import { clientIp, rateLimiter } from '../../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

const perIp = rateLimiter(20, 10 * 60_000);

/**
 * Étape 1 : l'appli ouvre cette adresse avec un nonce aléatoire gardé sur le téléphone.
 * On l'envoie vers l'écran d'autorisation Google, avec un « state » signé qui reviendra au retour.
 */
export function GET(req: Request) {
  const cfg = googleHealthConfig();
  if (!cfg) return healthError('not_configured', 503, NOT_CONFIGURED_MESSAGE);
  const nonce = new URL(req.url).searchParams.get('nonce');
  if (!isNonce(nonce)) return healthError('bad_request', 400, 'Lien de connexion invalide');
  if (perIp(clientIp(req))) return healthError('rate_limited', 429, 'Trop de tentatives, réessaie dans 10 minutes.');
  const url = authorizeUrl(cfg.clientId, redirectUri(req), signState(cfg.secret, nonce));
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });
}
