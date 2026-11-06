import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL, LegalField } from '../../lib/legal';

export const metadata: Metadata = { title: 'Mentions légales — Road to Baki' };

export default function Mentions() {
  return (
    <main className="legal">
      <Link href="/">← Retour</Link>
      <h1>Mentions légales</h1>

      <h2>Éditeur</h2>
      <p>
        <LegalField value={LEGAL.name} todo="[Nom ou raison sociale]" />
        <br />
        <LegalField value={LEGAL.status} todo="[Statut (micro-entreprise, SAS…) et numéro SIREN]" />
        <br />
        <LegalField value={LEGAL.address} todo="[Adresse]" />
        <br />
        <LegalField value={LEGAL.email} todo="[E-mail de contact]" />
        <br />
        Directeur de la publication : <LegalField value={LEGAL.director} todo="[nom]" />
      </p>

      <h2>Hébergement</h2>
      <p>
        {LEGAL.host}
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Road to Baki est une application indépendante, non affiliée à l’auteur ni à l’éditeur du manga « Baki », ni à leurs ayants droit. Les marques citées appartiennent à leurs
        propriétaires respectifs.
      </p>
      <p>
        Personnage 3D dérivé du pack Universal Base Characters de Quaternius (CC0). Certaines animations proviennent de la CMU Graphics Lab Motion Capture Database
        (mocap.cs.cmu.edu), créée avec le soutien de la NSF (EIA-0196217).
      </p>
    </main>
  );
}
