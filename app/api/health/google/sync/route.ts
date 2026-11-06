import { GoogleHealthError, NOT_CONFIGURED_MESSAGE, errorStatus, googleHealthConfig, healthError, syncGoogleHealth } from '../../../../../lib/google-health';
import { openLink, sealLink } from '../../../../../lib/health-link';
import { MAX_SYNC_DAYS, isISODate } from '../../../../../lib/health-days';
import { clientIp, rateLimiter } from '../../../../../lib/restore-token';

export const dynamic = 'force-dynamic';

const perIp = rateLimiter(60, 10 * 60_000);

/**
 * Synchro : le téléphone envoie son lien chiffré, sa date du jour et le nombre de jours à relire.
 * Réponse : { days: { 'YYYY-MM-DD': { steps, kcal, hrAvg, sleepMin } }, link? } (link si Google a changé le jeton).
 * Rien n'est conservé côté serveur.
 */
export async function POST(req: Request) {
  const cfg = googleHealthConfig();
  if (!cfg) return healthError('not_configured', 503, NOT_CONFIGURED_MESSAGE);
  if (perIp(clientIp(req))) return healthError('rate_limited', 429, 'Trop de synchros, réessaie dans quelques minutes.');

  const body = (await req.json().catch(() => ({}))) as { link?: unknown; to?: unknown; days?: unknown };
  const link = openLink(cfg.secret, body.link);
  if (!link) return healthError('reconnect', 401, 'Connexion Google Health à refaire');
  if (!isISODate(body.to)) return healthError('bad_request', 400, 'Date invalide');
  const days = typeof body.days === 'number' && body.days >= 1 && body.days <= MAX_SYNC_DAYS ? Math.round(body.days) : 7;

  try {
    const result = await syncGoogleHealth(cfg, link.rt, body.to, days);
    const rotated = result.refreshToken ? sealLink(cfg.secret, { ...link, rt: result.refreshToken }) : undefined;
    return Response.json({ days: result.days, ...(rotated ? { link: rotated } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof GoogleHealthError) return healthError(e.code, errorStatus(e.code), e.message);
    return healthError('upstream', 502, 'Synchro impossible pour le moment');
  }
}
