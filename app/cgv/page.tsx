import type { Metadata } from 'next';
import Link from 'next/link';
import { PRICING } from '../../lib/pricing';
import { LEGAL, LegalField } from '../../lib/legal';

export const metadata: Metadata = { title: 'Conditions générales de vente — Road to Baki' };

export default function CGV() {
  return (
    <main className="legal">
      <Link href="/">← Retour</Link>
      <h1>Conditions générales de vente</h1>
      <p>
        En vigueur au <LegalField value={LEGAL.since} todo="[date de mise en ligne]" />.
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l’abonnement « Road to Baki Pro » proposé par <LegalField value={LEGAL.name} todo="[raison sociale / nom de l’éditeur]" /> (ci-après
        « l’Éditeur ») via l’application web Road to Baki. L’application est réservée aux abonnés : l’abonnement Pro donne accès aux programmes et séances guidées, aux
        démonstrations 3D, au suivi des repas et au jeûne.
      </p>

      <h2>2. Offres et prix</h2>
      <p>
        Deux formules sont proposées : mensuelle ({PRICING.monthly.price} TTC par mois) et annuelle ({PRICING.yearly.price} TTC par an). Les prix sont indiqués toutes taxes comprises. L’Éditeur
        peut modifier ses prix ; les nouveaux tarifs s’appliquent au renouvellement suivant, après information préalable de l’abonné.
      </p>

      <h2>3. Essai gratuit</h2>
      <p>
        Toute première souscription bénéficie d’un essai gratuit de {PRICING.trialDays} jours. Aucun montant n’est débité pendant l’essai. Sans résiliation avant la fin de l’essai,
        l’abonnement choisi démarre automatiquement et le premier paiement est prélevé.
      </p>

      <h2>4. Paiement</h2>
      <p>
        Le paiement est traité par Stripe Payments Europe Ltd. L’Éditeur n’a jamais accès aux données complètes de ta carte bancaire. L’abonnement est renouvelé automatiquement à chaque
        échéance jusqu’à résiliation.
      </p>

      <h2>5. Résiliation</h2>
      <p>
        Tu peux résilier à tout moment depuis l’application (Dojo → Réglages → Road to Baki Pro → Gérer mon abonnement). La résiliation prend effet à la fin de la période en cours ;
        aucun remboursement au prorata n’est effectué pour la période entamée.
      </p>

      <h2>6. Droit de rétractation</h2>
      <p>
        Conformément à l’article L221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour un contenu numérique fourni sur un support immatériel dont
        l’exécution a commencé avec ton accord exprès. En démarrant l’essai ou l’abonnement, tu demandes l’accès immédiat aux fonctionnalités Pro. L’essai gratuit te permet de
        tester le service sans frais avant tout paiement.
      </p>

      <h2>7. Santé</h2>
      <p>
        Les programmes d’entraînement, objectifs nutritionnels et protocoles de jeûne sont fournis à titre informatif et ne constituent pas un avis médical. Consulte un médecin avant
        de commencer un programme, en particulier en cas de pathologie, de grossesse ou de douleur. Arrête immédiatement tout exercice douloureux.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        L’Éditeur met tout en œuvre pour assurer la disponibilité du service sans garantir une absence totale d’interruption. Les données de l’application étant stockées sur ton appareil,
        leur sauvegarde relève de ta responsabilité (suppression du cache du navigateur, changement d’appareil…).
      </p>

      <h2>9. Litiges</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige, tu peux recourir gratuitement à un médiateur de la consommation :{' '}
        <LegalField value={LEGAL.mediator} todo="[nom et coordonnées du médiateur]" />, ou à la plateforme européenne de règlement en ligne des litiges.
      </p>

      <h2>10. Contact</h2>
      <p>
        <LegalField value={LEGAL.email} todo="[e-mail de contact]" />
      </p>
    </main>
  );
}
