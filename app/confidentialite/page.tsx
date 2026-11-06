import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL, LegalField } from '../../lib/legal';

export const metadata: Metadata = { title: 'Politique de confidentialité — Road to Baki' };

export default function Confidentialite() {
  return (
    <main className="legal">
      <Link href="/">← Retour</Link>
      <h1>Politique de confidentialité</h1>
      <p>
        Responsable du traitement : <LegalField value={LEGAL.name} todo="[raison sociale]" />, <LegalField value={LEGAL.address} todo="[adresse]" />,{' '}
        <LegalField value={LEGAL.email} todo="[e-mail]" />.
      </p>

      <h2>Données stockées sur ton appareil</h2>
      <p>
        Road to Baki fonctionne sans compte. Ton profil (âge, taille, poids, objectifs, douleurs), tes séances, tes repas, ton eau et tes réglages sont enregistrés uniquement dans le
        stockage local de ton navigateur. Ils ne sont pas envoyés à nos serveurs. Tu peux tout effacer depuis Dojo → Réglages → Réinitialiser.
      </p>

      <h2>Abonnement (Stripe)</h2>
      <p>
        Si tu t’abonnes, ton e-mail et tes informations de paiement sont collectés par Stripe (sous-traitant, certifié PCI-DSS) pour gérer l’abonnement. L’application conserve
        sur ton appareil un jeton d’accès signé, valable 180 jours, qui permet de vérifier que ton abonnement est actif. Base légale : exécution du contrat.
      </p>

      <h2>Restauration de l’abonnement</h2>
      <p>
        Pour restaurer ton abonnement sur un autre appareil, tu saisis l’e-mail utilisé au paiement : un code à 6 chiffres, valable 10 minutes, t’est envoyé par Resend
        (sous-traitant d’envoi d’e-mails). Le code n’est enregistré nulle part : il est vérifié grâce à une signature. Base légale : exécution du contrat.
      </p>

      <h2>Recherche d’aliments</h2>
      <p>La recherche d’aliments interroge la base ouverte Open Food Facts. Seul le terme recherché est transmis.</p>

      <h2>Photo d’un repas</h2>
      <p>
        Si tu utilises « Photo du repas », la photo est réduite sur ton appareil puis envoyée à l’API Gemini de Google (sous-traitant) pour estimer les calories et les macros.
        Elle n’est ni conservée sur nos serveurs ni associée à ton identité ; seul le résultat (nom du plat et valeurs) est enregistré, sur ton appareil. Base légale : ton
        consentement, donné à chaque fois que tu prends une photo.
      </p>

      <h2>Appareils connectés (Google Health)</h2>
      <p>
        Si tu connectes Google Health (Dojo → Réglages → Appareils connectés), l’application lit, avec ton accord donné sur l’écran de Google, tes pas, tes calories
        dépensées, ta fréquence cardiaque et ton sommeil des 30 derniers jours au plus. Ces données peuvent venir de ta montre ou de ton bracelet, ou des pas comptés
        par ton téléphone, si tu les as reliés à l’appli Google Health. Ce sont des données de santé : on n’en lit pas d’autres, on n’écrit rien chez Google
        et on ne les utilise que pour remplir ton journal.
      </p>
      <p>
        L’autorisation donnée par Google est chiffrée et gardée uniquement sur ton téléphone. À chaque synchronisation, notre serveur s’en sert pour interroger Google
        (sous-traitant), puis renvoie les résultats à ton téléphone sans rien conserver. Les valeurs importées sont enregistrées dans le stockage local de ton
        navigateur, comme le reste de ton journal. Base légale : ton consentement explicite. Tu peux le retirer à tout moment avec « Déconnecter », qui révoque
        l’accès chez Google, ou depuis ton compte Google (myaccount.google.com → Sécurité → Applications tierces). Les pas déjà importés restent dans ton journal
        jusqu’à ce que tu les effaces (Dojo → Réglages → Réinitialiser).
      </p>

      <h2>Cookies</h2>
      <p>L’application n’utilise pas de cookies publicitaires ni de traceurs tiers.</p>

      <h2>Tes droits</h2>
      <p>
        Tu disposes d’un droit d’accès, de rectification, d’effacement, d’opposition et de portabilité sur les données que nous détenons (données d’abonnement). Écris à{' '}
        <LegalField value={LEGAL.email} todo="[e-mail]" />. Tu peux aussi saisir la CNIL (cnil.fr).
      </p>
    </main>
  );
}
