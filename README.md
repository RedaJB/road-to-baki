# Road to Baki

Appli web d'entraînement (installable sur téléphone) : séances guidées avec démos 3D, programme personnalisé qui progresse par blocs de 4 semaines, nutrition, jeûne et abonnement Pro.

- `/` : page de vente (lien en bio TikTok)
- `/app` : l'appli
- `/cgv`, `/confidentialite`, `/mentions-legales` : pages légales (identité de l'éditeur : variables `NEXT_PUBLIC_LEGAL_*`)

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les clés
npm run dev                  # http://localhost:3000
```

Vérifications : `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.

## Abonnement Stripe

1. Crée un compte sur stripe.com.
2. Dans *Catalogue de produits*, crée le produit « Road to Baki Pro » avec deux prix récurrents : mensuel (6,99 €) et annuel (24,99 €), ou lance `node scripts/stripe-setup.mjs` qui les crée pour toi. Ces montants sont affichés dans l'appli depuis `lib/pricing.ts` (`MONTHLY_CENTS`, `YEARLY_CENTS`) : garde les deux identiques. Pour changer un prix, crée un nouveau prix dans Stripe (un prix Stripe ne se modifie pas) et mets son identifiant dans `STRIPE_PRICE_MONTHLY` ou `STRIPE_PRICE_YEARLY`. Les abonnés déjà en place gardent leur ancien tarif.
3. Copie dans `.env.local` : `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `NEXT_PUBLIC_APP_URL`.
4. Active le *Portail client* dans Stripe (Paramètres → Facturation → Portail client) pour que les abonnés puissent résilier eux-mêmes.

Teste avec la carte `4242 4242 4242 4242` et les clés `sk_test_…`.

Fonctionnement : pas de compte utilisateur. Après le paiement, le serveur délivre un jeton d'accès signé (`RESTORE_SECRET`) que l'appli garde sur le téléphone. Ce jeton est la seule preuve acceptée pour re-vérifier l'abonnement (toutes les 6 h) et ouvrir l'espace client Stripe. Un identifiant client seul ne suffit plus.

### Restaurer un abonnement (code par e-mail)

« Restaurer mon abonnement » envoie un code à 6 chiffres à l'e-mail du paiement, valable 10 minutes. Le statut et le jeton d'accès ne sont renvoyés qu'après saisie du bon code. Le code n'est stocké nulle part : il voyage dans un jeton signé (HMAC-SHA256), donc pas de base de données.

1. Crée un compte sur resend.com, vérifie ton domaine (*Domains*), puis crée une clé (*API Keys*).
2. Dans `.env.local` : `RESEND_API_KEY`, `RESEND_FROM` (ex. `Road to Baki <code@tondomaine.fr>`) et `RESTORE_SECRET` (32 caractères minimum : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. Ne change pas `RESTORE_SECRET` après la mise en ligne : tous les abonnés devraient restaurer leur abonnement à nouveau.

Limites anti-abus : 3 codes par e-mail et 10 demandes par IP toutes les 10 minutes, 5 essais par code. Ces compteurs sont en mémoire, donc propres à chaque instance du serveur.

## Appareils connectés (Google Health)

Dojo → Réglages → *Appareils connectés* importe tout seul les pas, et aussi les calories, le cardio et le sommeil quand l'appareil les mesure. Ça passe par l'API Google Health, qui a remplacé l'API Fitbit (coupée le 30 octobre 2026). Elle renvoie ce que l'appli **Google Health** (ex-Fitbit) connaît :

- les montres Fitbit et Pixel Watch ;
- les pas du téléphone et des autres montres (Garmin, Samsung, Xiaomi, Amazfit, Oura, Apple Watch…), si l'utilisateur relie Google Health à Health Connect (Android) ou à Apple Santé (iPhone).

Une appli web ne peut pas lire Apple Santé ni Health Connect directement. Il faudrait une appli native publiée sur les stores.

### Mise en place (gratuite)

1. Va sur [console.cloud.google.com](https://console.cloud.google.com) avec ton compte Google et crée un projet (ex. « Road to Baki »).
2. *API et services → Bibliothèque* : cherche **Google Health API** et clique sur *Activer*.
3. *Google Auth Platform → Audience* : choisis le type d'utilisateur **Externe**. Tant que l'appli est « En test », ajoute ton e-mail dans *Utilisateurs test*.
4. *Accès aux données → Ajouter des champs d'application* : coche les trois `googlehealth.activity_and_fitness.readonly`, `googlehealth.health_metrics_and_measurements.readonly` et `googlehealth.sleep.readonly`.
5. *Clients → Créer un client* : type **Application Web**. Dans *URI de redirection autorisés*, ajoute `http://localhost:3000/api/health/google/callback` et `http://localhost:3124/api/health/google/callback` (dev, selon le port utilisé), et `https://<ton-domaine>/api/health/google/callback` (prod).
6. Copie l'ID client et le code secret dans `.env.local` : `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`. `HEALTH_LINK_SECRET` doit faire 32 caractères minimum (même commande que `RESTORE_SECRET`). Ne le change plus après la mise en ligne, sinon tout le monde devra se reconnecter.
7. Redémarre `npm run dev`, puis teste depuis Dojo → Réglages → Appareils connectés.

Pour l'utilisateur : l'appli Google Health doit être installée sur son téléphone, avec le même compte Google. Sinon la connexion renvoie « Ouvre d'abord l'appli Google Health ».

### Limites de Google

- En mode **En test** : 100 utilisateurs test au maximum, et Google coupe l'accès au bout de 7 jours (il faut se reconnecter).
- Si tu passes l'appli en **production** sans validation : 100 utilisateurs maximum, et Google affiche un écran « appli non validée ».
- Au-delà de 100 utilisateurs : il faut la validation Google (page d'accueil, politique de confidentialité, vidéo de démo) et un audit de sécurité CASA, payé à un labo agréé. Compte environ 540 $/an chez TAC Security, 3 000 à 4 500 $ ailleurs. Prévois plusieurs semaines.

### Fonctionnement

Le serveur ne garde rien, il n'y a pas de base de données.

- **Connexion** : `/api/health/google/start` envoie vers Google avec un `state` signé. Au retour, `/api/health/google/callback` chiffre le jeton Google (AES-256-GCM, clé `HEALTH_LINK_SECRET`) et le rend à l'appli dans le fragment de l'URL. Ce lien chiffré reste sur le téléphone.
- **Synchro** : `/api/health/google/sync` lit les totaux par jour (`dailyRollUp`). Elle se lance à l'ouverture de l'appli et au retour au premier plan, au plus toutes les 15 min. Elle relit tout le mois à la première synchro.
- **Pas** : pour chaque jour, on garde le plus grand nombre entre la saisie manuelle et l'appareil.
- **Déconnexion** : `/api/health/google/disconnect` révoque l'accès chez Google.

## Personnage 3D

Les démos d'exercices utilisent le combattant de `public/fighter/` en rendu manga : tête sans visage, frange et crinière rousses en pointes, musculature encrée, pantalon de combat et ceinture rouge.

- Corps : « Superhero Male » du pack [Universal Base Characters](https://quaternius.itch.io/universal-base-characters) de Quaternius (licence CC0, usage commercial libre), transformé par `scripts/build-manga-hero.py` (Python 3, numpy, Pillow) : visage comblé, muscles épaissis, crinière modelée sur le crâne, carte d'encrage des muscles (`hero-ink.png`).
- Rendu (`lib/fighter3d/manga.ts`) : aplats, ombres hachurées à l'encre, traits des muscles plus gras dans l'ombre, contours d'épaisseur constante, ombre au sol en trame de points. La lumière est fixée par rapport à la caméra : chaque image se lit comme une case de manga.
- Sprint, shadow boxing et mae-geri : vraies captures de mouvement (base CMU, voir `public/fighter/CREDITS.txt`), transférées sur le squelette du combattant par `scripts/retarget-cmu.py` et déclarées dans `public/fighter/manifest.json` (`anims`).
- Autres exercices (`lib/fighter3d/motions.ts`, `player.ts`) : courbes continues entre les poses clés (pas d'arrêt à chaque pose), tête qui suit avec un léger retard, respiration, appuis fixes (mains et pieds ne glissent plus), paumes à plat au sol pour les pompes et le gainage, poings fermés ailleurs, épaules qui montent avec les bras.

Si le modèle ne se charge pas, l'appli affiche le combattant généré par code (`lib/fighter3d/rig.ts`), dans le même style.

Pour régénérer les portraits de l'appli (`public/fighters/`) : `npm run dev` puis `node scripts/render-fighters.mjs` (port 3124 par défaut). Pour les captures de la page de vente : `node scripts/capture-screens.mjs`.

Tu peux aussi le remplacer par n'importe quel personnage riggé dont tu as les droits (Mixamo, Blender, VRM…), sans toucher au code : mets-le dans `public/fighter/` à la place du combattant. Le dossier `public/models/` sert aux essais en local : il n'est pas publié et n'est utilisé que si `public/fighter/manifest.json` est absent.

```
public/fighter/
  manifest.json
  perso.fbx              (ou .glb)
  anims/push-up.fbx      (optionnel)
```

`manifest.json` :

```json
{
  "model": "perso.fbx",
  "toon": true,
  "anims": { "pompe": "anims/push-up.fbx", "squat_saute": "anims/jump-squat.fbx" }
}
```

- Les os sont reconnus automatiquement (noms Mixamo, Unreal, VRM, Blender), en pose de repos T ou A.
- Les exercices listés dans `anims` jouent le clip fourni. Les autres sont animés automatiquement à partir des poses de `lib/fighter3d/motions.ts`.
- Les identifiants d'exercices sont les clés de `EXERCISES` dans `lib/programs.ts`.

Pour contrôler toutes les animations d'un coup : `npm run dev` puis ouvre `/dev-3d`. Pour tester avec un squelette Mixamo de démonstration : `/dev-3d?model=synthetic`. Avec le personnage de l'appli : `/dev-3d?model=manifest`.

## Pubs TikTok

Quatre pubs 1080×1920 (15 s, MP4 H.264) se génèrent dans `pubs/` :

```bash
npm run dev                          # dans un premier terminal (port 3124 dans les scripts)
node scripts/capture-screens.mjs     # captures HD des écrans → public/screens/
node scripts/render-ads.mjs          # vidéos → pubs/*.mp4 + couvertures
```

Les scènes, textes et durées sont dans `app/dev-ads/page.tsx` (fonction `ADS`). Ajoute un son tendance directement dans TikTok au moment de la publication. Les vidéos n'ont pas de piste audio.

Autres outils : `node scripts/make-icons.mjs` (icônes de l'appli), `node scripts/check-video.mjs pubs/xxx.mp4` (vérifie qu'une vidéo se lit).

Les scripts utilisent Chrome ou Edge installés sur la machine. Pour un autre emplacement, définis `CHROME_PATH`.

## Mise en ligne

Le plus simple : Vercel (import du dépôt GitHub, ajout des variables d'environnement, déploiement).

Avant d'ouvrir les ventes :

1. Dans Vercel, renseigne les variables `NEXT_PUBLIC_LEGAL_*` de `.env.example` : nom, statut et SIREN, adresse, e-mail, médiateur de la consommation, date des CGV. Elles remplissent `/mentions-legales`, `/cgv` et `/confidentialite` (un champ vide reste surligné).
2. Dans Stripe en mode réel : nom public du compte, produit, deux prix, portail client. Copie dans Vercel `STRIPE_SECRET_KEY=sk_live_…` et les nouveaux `price_…`.
3. Dans Vercel, renseigne toutes les variables de `.env.example`, avec `NEXT_PUBLIC_APP_URL` égale à l'adresse publique.
4. Abonnement mensuel réel avec ta propre carte, puis restauration par e-mail et ouverture de l'espace client. Rembourse-toi depuis Stripe.

Les pages `/dev-3d`, `/dev-ads` et `/dev-portraits` renvoient une erreur 404 en production (`ENABLE_DEV_PAGES=1` pour les réactiver). Le contenu de `public/models/` n'est pas publié (`.gitignore`, `.vercelignore`) : en ligne, l'appli utilise le combattant de `public/fighter/`.

## Droits

Le nom et l'univers « Baki » appartiennent à leurs ayants droit. Avant de vendre l'appli ou de diffuser des pubs, obtiens une licence ou renomme l'appli. Les visuels générés ici (icônes, pubs) sont originaux ; le combattant 3D dérive d'un modèle CC0 (voir `public/fighter/CREDITS.txt`).
