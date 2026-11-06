import { googleHealthConfig, revokeToken } from '../../../../../lib/google-health';
import { openLink } from '../../../../../lib/health-link';

export const dynamic = 'force-dynamic';

/** Déconnexion : on retire l'autorisation chez Google. Le téléphone efface son lien de son côté. */
export async function POST(req: Request) {
  const cfg = googleHealthConfig();
  const body = (await req.json().catch(() => ({}))) as { link?: unknown };
  const link = cfg ? openLink(cfg.secret, body.link) : null;
  if (link) await revokeToken(link.rt);
  return Response.json({ ok: true, revoked: !!link }, { headers: { 'Cache-Control': 'no-store' } });
}
