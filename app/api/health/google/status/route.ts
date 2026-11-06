import { googleHealthConfig } from '../../../../../lib/google-health';

export const dynamic = 'force-dynamic';

/** L'appli demande si la connexion Google Health est disponible sur ce serveur */
export function GET() {
  return Response.json({ configured: googleHealthConfig() !== null }, { headers: { 'Cache-Control': 'no-store' } });
}
