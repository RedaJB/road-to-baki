import type { Metadata } from 'next';
import Link from 'next/link';
import { PRICING, PRO_FEATURES } from '../lib/pricing';

export const metadata: Metadata = {
  title: 'Road to Baki — Entraîne-toi comme un combattant',
  description: 'Un programme sur mesure qui progresse chaque semaine, séances guidées avec démos 3D, nutrition et jeûne. Adapté à ton corps, ton matériel et tes blessures. 7 jours offerts.',
  openGraph: {
    title: 'Road to Baki — Entraîne-toi comme un combattant',
    description: 'Séances guidées, démos 3D, nutrition, jeûne. Ton plan en 1 minute.',
    images: ['/screens/workout.png'],
    type: 'website',
    locale: 'fr_FR',
  },
};

const FEATURES = [
  { t: 'Séances guidées', d: 'Séries à valider, charges, chrono de repos avec bips : tu n’as qu’à suivre.' },
  { t: 'Démos 3D', d: 'Chaque exercice montré en 3D sous tous les angles. Fini les mouvements approximatifs.' },
  { t: 'Un programme qui progresse', d: 'Blocs de 4 semaines : fondation, volume, intensité, récupération. La charge conseillée monte quand tu progresses.' },
  { t: 'Adapté à toi', d: 'Salle ou maison, douleurs au dos ou aux genoux : les exercices à risque sont remplacés.' },
  { t: 'Nutrition & jeûne', d: 'Calories et macros calculées pour ton objectif, suivi de l’eau et du jeûne.' },
  { t: 'Progression', d: 'Records, séries de jours, volume soulevé. Tu vois ce que tu as gagné.' },
];

const FAQ = [
  { q: 'C’est pour les débutants ?', a: 'Oui. Le volume, les temps de repos et les exercices s’adaptent à ton niveau dès le questionnaire.' },
  { q: 'Il faut une salle de sport ?', a: 'Non. En mode « Maison », chaque exercice qui demande du matériel est remplacé par une variante au poids du corps.' },
  { q: 'Comment marche l’essai gratuit ?', a: `Tu réponds au questionnaire, puis tu lances ${PRICING.trialDays} jours d’essai. Aucun débit avant la fin de l’essai, et tu peux annuler en deux clics depuis l’appli.` },
  { q: 'Mes données sont où ?', a: 'Sur ton téléphone. Pas de compte à créer : ton profil, tes séances et tes repas restent sur ton appareil.' },
  { q: 'Je peux l’installer comme une appli ?', a: 'Oui : ouvre le site sur ton téléphone puis « Ajouter à l’écran d’accueil ». Elle se lance en plein écran, comme une appli.' },
];

export default function Landing() {
  return (
    <main className="lp">
      <header className="lp-nav">
        <span className="lp-logo">
          <span className="jp">道</span> Road to Baki
        </span>
        <nav>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#prix">Offres</a>
          <Link href="/app" className="lp-btn lp-btn--sm">
            Ouvrir l’appli
          </Link>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero__text">
          <p className="eyebrow">最強への道 · La voie du plus fort</p>
          <h1>Entraîne-toi comme un combattant.</h1>
          <p className="lp-lead">Des séances guidées avec démos 3D, la nutrition et le jeûne : tout est calibré pour ton corps, ton matériel et tes blessures. Ton plan est prêt en une minute.</p>
          <div className="lp-cta">
            <Link href="/app" className="lp-btn">
              Essayer {PRICING.trialDays} jours gratuits
            </Link>
            <a href="#prix" className="lp-btn lp-btn--ghost">
              Voir l’offre
            </a>
          </div>
          <p className="lp-small">Aucun débit pendant l’essai · Annulable en deux clics · iPhone et Android</p>
        </div>
        <div className="lp-phones">
          <div className="lp-phone lp-phone--back">
            <img src="/screens/graille.png" alt="Suivi des repas et des macros" />
          </div>
          <div className="lp-phone">
            <img src="/screens/workout.png" alt="Séance guidée avec démonstration 3D" />
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="lp-section">
        <h2>Tout ce qu’il faut pour progresser. Rien de plus.</h2>
        <div className="lp-grid">
          {FEATURES.map((f) => (
            <div key={f.t} className="lp-card">
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-split">
        <div className="lp-phone">
          <img src="/screens/onb-goal.png" alt="Questionnaire de départ" />
        </div>
        <div>
          <h2>Tu lances. L’appli s’occupe du reste.</h2>
          <ol className="lp-steps">
            <li>
              <strong>Réponds à 9 questions</strong>
              <span>Objectif, morphologie, niveau, matériel, douleurs.</span>
            </li>
            <li>
              <strong>Reçois ton programme</strong>
              <span>Construit pour ton objectif, ton nombre de séances et ton matériel.</span>
            </li>
            <li>
              <strong>Combats</strong>
              <span>Séance guidée série par série, repos chronométré, records enregistrés.</span>
            </li>
          </ol>
          <Link href="/app" className="lp-btn">
            Créer mon plan
          </Link>
        </div>
      </section>

      <section id="prix" className="lp-section">
        <h2>Une offre, tout inclus</h2>
        <div className="lp-pricing" style={{ gridTemplateColumns: 'minmax(0, 420px)', justifyContent: 'center' }}>
          <div className="lp-card lp-card--pro">
            <span className="lp-badge">{PRICING.trialDays} jours offerts</span>
            <h3>Road to Baki Pro</h3>
            <p className="lp-price">
              {PRICING.yearly.price}
              <small> {PRICING.yearly.per}</small>
            </p>
            <p className="lp-small">
              {PRICING.yearly.sub} · ou {PRICING.monthly.price} {PRICING.monthly.per}
            </p>
            <ul>
              {PRO_FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href="/app" className="lp-btn">
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <h2>Questions fréquentes</h2>
        <div className="lp-faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="lp-footer">
        <p>
          <Link href="/cgv">CGV</Link> · <Link href="/confidentialite">Confidentialité</Link> · <Link href="/mentions-legales">Mentions légales</Link>
        </p>
        <p className="lp-small">
          Road to Baki est une application indépendante, non affiliée à l’auteur ni à l’éditeur du manga « Baki ». Les conseils fournis ne remplacent pas l’avis d’un médecin.
        </p>
      </footer>
    </main>
  );
}
