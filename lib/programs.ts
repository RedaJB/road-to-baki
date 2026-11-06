/**
 * Programme Road to Baki — un seul programme, construit d'après l'objectif, le lieu et la fréquence.
 * Il existe en 2, 3, 4 et 5-6 séances par semaine, et progresse par blocs de 4 semaines
 * (fondation, volume, intensité, récupération). Les séances sont personnalisées via buildSession().
 */

export type Douleur = 'dos' | 'genoux' | 'epaules' | 'poignets' | 'autre';
export type Equip = 'aucun' | 'barre' | 'halteres' | 'machine' | 'barre_fixe' | 'banc' | 'kettlebell';

export interface BankExercise {
  id: string;
  name: string;
  muscle: string;
  kind: 'reps' | 'sec';
  equip: Equip[];
  cues: string[];
  /** Variante sans matériel (entraînement maison) */
  homeAlt?: string;
  /** Variante si douleur sur une zone */
  painAlt?: Partial<Record<Douleur, string>>;
  /** Exercice où on peut logger une charge */
  weighted?: boolean;
}

export interface ProgramExercise {
  id: string;
  sets: number;
  /** bas de la fourchette (reps ou secondes) */
  reps: number;
  /** haut de la fourchette */
  max?: number;
  /** mouvement principal de la séance */
  main?: boolean;
  /** Repos en secondes */
  rest: number;
  note?: string;
}

export interface ProgramDay {
  name: string;
  kanji: string;
  focus: string;
  warmup: string[];
  exercises: ProgramExercise[];
  finisher?: { name: string; desc: string };
}

/** Identifiant du programme personnalisé (clé de la progression et du carnet) */
export const PLAN_ID = 'perso';

export interface Program {
  id: string;
  title: string;
  tagline: string;
  /** 2 séances par semaine (full body) */
  days2: ProgramDay[];
  /** 3 séances par semaine */
  days3: ProgramDay[];
  /** 4 séances par semaine */
  days: ProgramDay[];
  /** 5e séance pour 5-6 séances par semaine */
  extra: ProgramDay;
}

/* ───────────────────────── BANQUE D'EXERCICES ───────────────────────── */

export const EXERCISES: Record<string, BankExercise> = {
  // — Poussée —
  pompe: {
    id: 'pompe', name: 'Pompes', muscle: 'Pectoraux · Triceps', kind: 'reps', equip: ['aucun'],
    cues: ['Corps gainé comme une planche', 'Coudes à 45°, pas en croix', 'Poitrine frôle le sol'],
    painAlt: { poignets: 'pompe_poings', epaules: 'pompe_inclinee' },
  },
  pompe_inclinee: {
    id: 'pompe_inclinee', name: 'Pompes inclinées', muscle: 'Pectoraux bas · Triceps', kind: 'reps', equip: ['aucun'],
    cues: ['Mains sur un banc ou une chaise', 'Descente lente en 2 secondes', 'Gainage total'],
  },
  pompe_explosive: {
    id: 'pompe_explosive', name: 'Pompes claquées', muscle: 'Pectoraux · Explosivité', kind: 'reps', equip: ['aucun'],
    cues: ['Pousse le sol comme pour le repousser', 'Claque, puis réception bras souples', 'Qualité > quantité'],
    painAlt: { poignets: 'pompe_poings', epaules: 'pompe' },
  },
  pompe_diamant: {
    id: 'pompe_diamant', name: 'Pompes diamant', muscle: 'Triceps · Pectoraux', kind: 'reps', equip: ['aucun'],
    cues: ['Pouces et index forment un diamant', 'Coudes serrés le long du corps', 'Descends jusqu’au sternum'],
    painAlt: { poignets: 'pompe_poings', epaules: 'pompe_inclinee' },
  },
  pompe_archer: {
    id: 'pompe_archer', name: 'Pompes archer', muscle: 'Pectoraux · Unilatéral', kind: 'reps', equip: ['aucun'],
    cues: ['Un bras travaille, l’autre reste tendu', 'Alterne les côtés', 'Hanches parallèles au sol'],
    painAlt: { poignets: 'pompe_poings', epaules: 'pompe' },
  },
  pompe_poings: {
    id: 'pompe_poings', name: 'Pompes sur les poings (Seiken)', muscle: 'Pectoraux · Poignets · Poings', kind: 'reps', equip: ['aucun'],
    cues: ['Appui sur les deux premières phalanges', 'Poignet aligné avec l’avant-bras', 'Sur un tapis au début'],
  },
  pompe_pike: {
    id: 'pompe_pike', name: 'Pompes pike', muscle: 'Épaules · Triceps', kind: 'reps', equip: ['aucun'],
    cues: ['Hanches hautes, corps en V inversé', 'La tête descend devant les mains', 'Coudes vers l’arrière'],
    painAlt: { epaules: 'pompe_inclinee', poignets: 'pompe_poings' },
  },
  handstand: {
    id: 'handstand', name: 'Équilibre contre le mur', muscle: 'Épaules · Gainage', kind: 'sec', equip: ['aucun'],
    cues: ['Ventre face au mur, mains à 20 cm', 'Bras verrouillés, épaules aux oreilles', 'Respire, ne panique pas'],
    painAlt: { epaules: 'hollow_hold', poignets: 'hollow_hold' },
  },
  dips: {
    id: 'dips', name: 'Dips', muscle: 'Triceps · Pectoraux', kind: 'reps', equip: ['aucun'],
    cues: ['Entre deux chaises ou aux barres', 'Épaules basses, loin des oreilles', 'Descends à 90° aux coudes'],
    painAlt: { epaules: 'pompe_diamant', poignets: 'pompe_poings' },
  },
  dips_lestes: {
    id: 'dips_lestes', name: 'Dips lestés', muscle: 'Triceps · Pectoraux', kind: 'reps', equip: ['machine'], weighted: true,
    cues: ['Ceinture de lest ou haltère entre les pieds', 'Buste légèrement penché', 'Montée explosive'],
    homeAlt: 'dips', painAlt: { epaules: 'extension_triceps' },
  },
  developpe: {
    id: 'developpe', name: 'Développé militaire', muscle: 'Épaules · Triceps', kind: 'reps', equip: ['barre'], weighted: true,
    cues: ['Fessiers et abdos serrés', 'Barre passe devant le visage', 'Tête passe « sous » la barre en haut'],
    homeAlt: 'pompe_pike', painAlt: { epaules: 'elevation_laterale', dos: 'developpe_halteres' },
  },
  developpe_halteres: {
    id: 'developpe_halteres', name: 'Développé haltères assis', muscle: 'Épaules', kind: 'reps', equip: ['halteres', 'banc'], weighted: true,
    cues: ['Dos collé au dossier', 'Haltères jusqu’aux oreilles', 'Ne verrouille pas en haut'],
    homeAlt: 'pompe_pike', painAlt: { epaules: 'elevation_laterale' },
  },
  developpe_couche: {
    id: 'developpe_couche', name: 'Développé couché', muscle: 'Pectoraux · Triceps', kind: 'reps', equip: ['barre', 'banc'], weighted: true,
    cues: ['Omoplates serrées, pieds ancrés', 'Barre touche le bas des pecs', 'Pousse en arrière vers le rack'],
    homeAlt: 'pompe', painAlt: { epaules: 'pompe_inclinee', poignets: 'pompe_poings' },
  },
  developpe_incline: {
    id: 'developpe_incline', name: 'Développé incliné haltères', muscle: 'Pectoraux hauts', kind: 'reps', equip: ['halteres', 'banc'], weighted: true,
    cues: ['Banc à 30°', 'Haltères descendent sur les côtés', 'Contraction en haut 1 s'],
    homeAlt: 'pompe_declinee', painAlt: { epaules: 'pompe_inclinee' },
  },
  pompe_declinee: {
    id: 'pompe_declinee', name: 'Pompes déclinées', muscle: 'Pectoraux hauts · Épaules', kind: 'reps', equip: ['aucun'],
    cues: ['Pieds surélevés sur une chaise', 'Corps droit', 'Descente contrôlée'],
    painAlt: { epaules: 'pompe', poignets: 'pompe_poings' },
  },
  elevation_laterale: {
    id: 'elevation_laterale', name: 'Élévations latérales', muscle: 'Épaules (deltoïde moyen)', kind: 'reps', equip: ['halteres'], weighted: true,
    cues: ['Coudes légèrement fléchis', 'Monte jusqu’à l’horizontale', 'Descente en 3 secondes'],
    homeAlt: 'pompe_pike',
  },
  extension_triceps: {
    id: 'extension_triceps', name: 'Extensions triceps', muscle: 'Triceps', kind: 'reps', equip: ['halteres'], weighted: true,
    cues: ['Coudes fixes, pointés vers le plafond', 'Étire bien en bas', 'Verrouille en haut'],
    homeAlt: 'pompe_diamant',
  },

  // — Tirage —
  tractions: {
    id: 'tractions', name: 'Tractions', muscle: 'Dos · Biceps', kind: 'reps', equip: ['barre_fixe'],
    cues: ['Pars bras tendus', 'Tire les coudes vers les hanches', 'Menton au-dessus de la barre'],
    homeAlt: 'rowing_inverse', painAlt: { epaules: 'rowing_inverse', poignets: 'rowing_inverse' },
  },
  traction_lestee: {
    id: 'traction_lestee', name: 'Tractions lestées (Dos du Démon)', muscle: 'Dos · Biceps', kind: 'reps', equip: ['barre_fixe', 'machine'], weighted: true,
    cues: ['Ceinture de lest', 'Pas d’élan', 'Serre le dos en haut 1 seconde'],
    homeAlt: 'tractions', painAlt: { epaules: 'rowing_haltere' },
  },
  traction_explosive: {
    id: 'traction_explosive', name: 'Tractions explosives', muscle: 'Dos · Puissance', kind: 'reps', equip: ['barre_fixe'],
    cues: ['Monte le plus vite possible', 'Vise la poitrine à la barre', 'Descente contrôlée'],
    homeAlt: 'rowing_inverse', painAlt: { epaules: 'rowing_inverse' },
  },
  chin_up: {
    id: 'chin_up', name: 'Tractions supination', muscle: 'Biceps · Dos', kind: 'reps', equip: ['barre_fixe'],
    cues: ['Paumes vers toi', 'Coudes vers l’avant', 'Contraction biceps en haut'],
    homeAlt: 'rowing_inverse',
  },
  rowing_inverse: {
    id: 'rowing_inverse', name: 'Rowing inversé (table / barre basse)', muscle: 'Dos · Biceps', kind: 'reps', equip: ['aucun'],
    cues: ['Sous une table solide, corps gainé', 'Tire la poitrine vers le bord', 'Omoplates serrées'],
  },
  rowing: {
    id: 'rowing', name: 'Rowing barre', muscle: 'Dos (épaisseur)', kind: 'reps', equip: ['barre'], weighted: true,
    cues: ['Buste à 45°, dos plat', 'Tire la barre au nombril', 'Pas de triche avec les jambes'],
    homeAlt: 'rowing_inverse', painAlt: { dos: 'rowing_haltere' },
  },
  rowing_haltere: {
    id: 'rowing_haltere', name: 'Rowing haltère un bras', muscle: 'Dos · Grand dorsal', kind: 'reps', equip: ['halteres', 'banc'], weighted: true,
    cues: ['Genou et main en appui sur le banc', 'Coude rasant le flanc', 'Étirement complet en bas'],
    homeAlt: 'rowing_inverse',
  },
  face_pull: {
    id: 'face_pull', name: 'Face pull', muscle: 'Arrière d’épaule · Posture', kind: 'reps', equip: ['machine'], weighted: true,
    cues: ['Corde à hauteur du visage', 'Tire vers les oreilles, coudes hauts', 'Rotation externe en fin'],
    homeAlt: 'y_raise',
  },
  y_raise: {
    id: 'y_raise', name: 'Y-raise au sol', muscle: 'Arrière d’épaule · Trapèzes bas', kind: 'reps', equip: ['aucun'],
    cues: ['À plat ventre, bras en Y', 'Pouces vers le ciel', 'Décolle les bras 2 secondes'],
  },
  curl: {
    id: 'curl', name: 'Curl biceps', muscle: 'Biceps', kind: 'reps', equip: ['halteres'], weighted: true,
    cues: ['Coudes collés au corps', 'Supination en haut', 'Pas de balancier'],
    homeAlt: 'chin_up_iso',
  },
  curl_marteau: {
    id: 'curl_marteau', name: 'Curl marteau', muscle: 'Biceps · Avant-bras', kind: 'reps', equip: ['halteres'], weighted: true,
    cues: ['Prise neutre (pouces en haut)', 'Monte jusqu’à l’épaule', 'Serre la poignée fort'],
    homeAlt: 'chin_up_iso',
  },
  chin_up_iso: {
    id: 'chin_up_iso', name: 'Curl serviette isométrique', muscle: 'Biceps', kind: 'sec', equip: ['aucun'],
    cues: ['Serviette sous le pied, tire vers le haut', 'Coudes à 90°', 'Contraction maximale'],
  },
  shrug: {
    id: 'shrug', name: 'Shrugs (haussements)', muscle: 'Trapèzes', kind: 'reps', equip: ['halteres'], weighted: true,
    cues: ['Monte les épaules aux oreilles', 'Pause 1 s en haut', 'Pas de rotation'],
    homeAlt: 'farmer_hold_home',
  },

  // — Jambes —
  squat_barre: {
    id: 'squat_barre', name: 'Squat barre', muscle: 'Quadriceps · Fessiers', kind: 'reps', equip: ['barre'], weighted: true,
    cues: ['Pieds largeur d’épaules', 'Genoux suivent les orteils', 'Descends sous la parallèle si possible'],
    homeAlt: 'squat_bulgare', painAlt: { genoux: 'hip_thrust', dos: 'presse' },
  },
  front_squat: {
    id: 'front_squat', name: 'Front squat', muscle: 'Quadriceps · Gainage', kind: 'reps', equip: ['barre'], weighted: true,
    cues: ['Barre sur les deltoïdes avant', 'Coudes hauts', 'Buste vertical'],
    homeAlt: 'squat_bulgare', painAlt: { genoux: 'hip_thrust', poignets: 'squat_barre' },
  },
  presse: {
    id: 'presse', name: 'Presse à cuisses', muscle: 'Quadriceps · Fessiers', kind: 'reps', equip: ['machine'], weighted: true,
    cues: ['Bas du dos collé au dossier', 'Ne verrouille pas les genoux', 'Amplitude complète'],
    homeAlt: 'squat_bulgare', painAlt: { genoux: 'leg_curl' },
  },
  squat_saute: {
    id: 'squat_saute', name: 'Squats sautés', muscle: 'Quadriceps · Puissance', kind: 'reps', equip: ['aucun'],
    cues: ['Saute le plus haut possible', 'Réception silencieuse', 'Enchaîne sans pause'],
    painAlt: { genoux: 'pont_fessier' },
  },
  squat_bulgare: {
    id: 'squat_bulgare', name: 'Squat bulgare', muscle: 'Quadriceps · Fessiers', kind: 'reps', equip: ['aucun'],
    cues: ['Pied arrière sur une chaise', 'Genou avant au-dessus de la cheville', 'Reps par jambe'],
    painAlt: { genoux: 'pont_fessier' },
  },
  pistol: {
    id: 'pistol', name: 'Pistol squat assisté', muscle: 'Quadriceps · Équilibre', kind: 'reps', equip: ['aucun'],
    cues: ['Tiens-toi à un poteau si besoin', 'Jambe libre tendue devant', 'Reps par jambe'],
    painAlt: { genoux: 'pont_fessier' },
  },
  fente_sautee: {
    id: 'fente_sautee', name: 'Fentes sautées', muscle: 'Jambes · Cardio', kind: 'reps', equip: ['aucun'],
    cues: ['Change de jambe en l’air', 'Genou arrière frôle le sol', 'Buste droit'],
    painAlt: { genoux: 'pont_fessier' },
  },
  squat_statique: {
    id: 'squat_statique', name: 'Posture du Cavalier (Kiba Dachi)', muscle: 'Quadriceps · Mental', kind: 'sec', equip: ['aucun'],
    cues: ['Pieds deux fois la largeur d’épaules', 'Cuisses parallèles au sol', 'Poings à la ceinture, regard fixe'],
    painAlt: { genoux: 'gainage' },
  },
  chaise: {
    id: 'chaise', name: 'Chaise au mur', muscle: 'Quadriceps · Endurance', kind: 'sec', equip: ['aucun'],
    cues: ['Dos collé au mur', 'Genoux à 90°', 'Ne pose pas les mains sur les cuisses'],
    painAlt: { genoux: 'pont_fessier_iso' },
  },
  souleve_terre: {
    id: 'souleve_terre', name: 'Soulevé de terre', muscle: 'Chaîne postérieure', kind: 'reps', equip: ['barre'], weighted: true,
    cues: ['Barre contre les tibias', 'Dos neutre, poitrine fière', 'Pousse le sol, hanches et épaules montent ensemble'],
    homeAlt: 'souleve_une_jambe', painAlt: { dos: 'hip_thrust' },
  },
  souleve_roumain: {
    id: 'souleve_roumain', name: 'Soulevé de terre roumain', muscle: 'Ischios · Fessiers', kind: 'reps', equip: ['barre'], weighted: true,
    cues: ['Genoux légèrement fléchis, fixes', 'Hanches vers l’arrière', 'Barre glisse le long des cuisses'],
    homeAlt: 'souleve_une_jambe', painAlt: { dos: 'leg_curl' },
  },
  souleve_une_jambe: {
    id: 'souleve_une_jambe', name: 'Soulevé une jambe (poids du corps)', muscle: 'Ischios · Équilibre', kind: 'reps', equip: ['aucun'],
    cues: ['Bascule le buste, jambe arrière tendue', 'Bassin bien horizontal', 'Reps par jambe'],
    painAlt: { dos: 'pont_fessier' },
  },
  hip_thrust: {
    id: 'hip_thrust', name: 'Hip thrust', muscle: 'Fessiers', kind: 'reps', equip: ['barre', 'banc'], weighted: true,
    cues: ['Haut du dos sur le banc', 'Menton rentré', 'Serre les fessiers 1 s en haut'],
    homeAlt: 'pont_fessier',
  },
  pont_fessier: {
    id: 'pont_fessier', name: 'Pont fessier', muscle: 'Fessiers · Ischios', kind: 'reps', equip: ['aucun'],
    cues: ['Pieds proches des fesses', 'Pousse sur les talons', 'Pause 2 s en haut'],
  },
  pont_fessier_iso: {
    id: 'pont_fessier_iso', name: 'Pont fessier tenu', muscle: 'Fessiers', kind: 'sec', equip: ['aucun'],
    cues: ['Bassin haut', 'Fessiers contractés en continu', 'Respire'],
  },
  leg_curl: {
    id: 'leg_curl', name: 'Leg curl', muscle: 'Ischio-jambiers', kind: 'reps', equip: ['machine'], weighted: true,
    cues: ['Hanches collées au banc', 'Monte vite, descends lentement', 'Amplitude complète'],
    homeAlt: 'souleve_une_jambe',
  },
  mollets: {
    id: 'mollets', name: 'Mollets debout', muscle: 'Mollets', kind: 'reps', equip: ['aucun'],
    cues: ['Sur une marche, talons dans le vide', 'Monte sur la pointe, pause 1 s', 'Étire bien en bas'],
  },

  // — Gainage & abdos —
  gainage: {
    id: 'gainage', name: 'Planche', muscle: 'Gainage', kind: 'sec', equip: ['aucun'],
    cues: ['Coudes sous les épaules', 'Fessiers serrés, bassin neutre', 'Respiration lente'],
  },
  gainage_lateral: {
    id: 'gainage_lateral', name: 'Planche latérale', muscle: 'Obliques', kind: 'sec', equip: ['aucun'],
    cues: ['Corps aligné de la tête aux pieds', 'Hanche haute', 'Temps par côté'],
  },
  hollow_hold: {
    id: 'hollow_hold', name: 'Hollow hold', muscle: 'Abdos profonds', kind: 'sec', equip: ['aucun'],
    cues: ['Bas du dos plaqué au sol', 'Bras et jambes tendus, décollés', 'Forme de banane'],
  },
  leg_raise: {
    id: 'leg_raise', name: 'Relevés de jambes', muscle: 'Abdos bas', kind: 'reps', equip: ['aucun'],
    cues: ['Allongé ou suspendu à une barre', 'Jambes tendues', 'Pas d’élan'],
    painAlt: { dos: 'hollow_hold' },
  },
  crunch: {
    id: 'crunch', name: 'Crunch', muscle: 'Abdominaux', kind: 'reps', equip: ['aucun'],
    cues: ['Enroule la colonne', 'Expire en montant', 'Ne tire pas sur la nuque'],
  },
  russian_twist: {
    id: 'russian_twist', name: 'Russian twist', muscle: 'Obliques', kind: 'reps', equip: ['aucun'],
    cues: ['Pieds décollés', 'Rotation des épaules, pas des bras', 'Reps totales'],
    painAlt: { dos: 'gainage_lateral' },
  },
  dragon_flag: {
    id: 'dragon_flag', name: 'Dragon flag négatif', muscle: 'Abdos · Force totale', kind: 'reps', equip: ['banc'],
    cues: ['Tiens le banc derrière la tête', 'Corps rigide comme une barre', 'Descends en 4 secondes'],
    homeAlt: 'leg_raise', painAlt: { dos: 'hollow_hold' },
  },

  // — Conditionnement & combat —
  burpee: {
    id: 'burpee', name: 'Burpees', muscle: 'Full body · Cardio', kind: 'reps', equip: ['aucun'],
    cues: ['Poitrine au sol', 'Saut avec claquement de mains', 'Rythme constant'],
    painAlt: { genoux: 'mountain_climber', poignets: 'shadow_boxing' },
  },
  mountain_climber: {
    id: 'mountain_climber', name: 'Mountain climbers', muscle: 'Cardio · Gainage', kind: 'sec', equip: ['aucun'],
    cues: ['Position pompe', 'Genoux à la poitrine, vite', 'Hanches basses'],
    painAlt: { poignets: 'shadow_boxing' },
  },
  bear_crawl: {
    id: 'bear_crawl', name: 'Marche de l’ours', muscle: 'Full body · Primal', kind: 'sec', equip: ['aucun'],
    cues: ['Genoux à 3 cm du sol', 'Main opposée / pied opposé', 'Dos plat comme une table'],
    painAlt: { poignets: 'mountain_climber', genoux: 'gainage' },
  },
  sprint: {
    id: 'sprint', name: 'Sprint sur place', muscle: 'Cardio · Explosivité', kind: 'sec', equip: ['aucun'],
    cues: ['Genoux hauts', 'Bras qui pompent', '100 % d’intensité'],
    painAlt: { genoux: 'shadow_boxing' },
  },
  shadow_boxing: {
    id: 'shadow_boxing', name: 'Shadow boxing', muscle: 'Cardio · Vitesse', kind: 'sec', equip: ['aucun'],
    cues: ['Garde haute, menton rentré', 'Enchaînements jab-cross-crochet', 'Bouge sur les appuis'],
  },
  seiken: {
    id: 'seiken', name: 'Seiken-zuki (coups de poing)', muscle: 'Épaules · Vitesse', kind: 'reps', equip: ['aucun'],
    cues: ['Rotation du poing à l’impact', 'Hanches qui tournent', 'Kiai sur la dernière rep'],
  },
  mae_geri: {
    id: 'mae_geri', name: 'Mae-geri (coup de pied avant)', muscle: 'Jambes · Hanches', kind: 'reps', equip: ['aucun'],
    cues: ['Monte le genou d’abord', 'Frappe avec la plante du pied', 'Reviens en garde'],
    painAlt: { genoux: 'seiken' },
  },
  corde: {
    id: 'corde', name: 'Corde à sauter', muscle: 'Cardio · Mollets', kind: 'sec', equip: ['aucun'],
    cues: ['Petits sauts sur l’avant du pied', 'Poignets qui tournent, pas les bras', 'Sans corde : mime le mouvement'],
    painAlt: { genoux: 'shadow_boxing' },
  },
  kb_swing: {
    id: 'kb_swing', name: 'Kettlebell swing', muscle: 'Chaîne postérieure · Cardio', kind: 'reps', equip: ['kettlebell'], weighted: true,
    cues: ['Mouvement de hanches, pas de squat', 'Kettlebell à hauteur des yeux', 'Fessiers verrouillés en haut'],
    homeAlt: 'burpee', painAlt: { dos: 'pont_fessier' },
  },

  // — Grip (Hanayama) —
  farmer_walk: {
    id: 'farmer_walk', name: 'Farmer walk', muscle: 'Grip · Trapèzes · Gainage', kind: 'sec', equip: ['halteres'], weighted: true,
    cues: ['Haltères les plus lourds possible', 'Épaules basses, buste droit', 'Petits pas rapides'],
    homeAlt: 'farmer_hold_home',
  },
  farmer_hold_home: {
    id: 'farmer_hold_home', name: 'Port de sacs lourds', muscle: 'Grip · Trapèzes', kind: 'sec', equip: ['aucun'],
    cues: ['Deux sacs remplis (bouteilles d’eau)', 'Marche ou tiens sur place', 'Serre fort'],
  },
  dead_hang: {
    id: 'dead_hang', name: 'Suspension à la barre', muscle: 'Grip · Épaules', kind: 'sec', equip: ['barre_fixe'],
    cues: ['Bras tendus, épaules actives', 'Pouce autour de la barre', 'Respire calmement'],
    homeAlt: 'towel_squeeze', painAlt: { epaules: 'towel_squeeze' },
  },
  towel_hang: {
    id: 'towel_hang', name: 'Suspension serviette', muscle: 'Grip de fer', kind: 'sec', equip: ['barre_fixe'],
    cues: ['Deux serviettes sur la barre', 'Serre comme si ta vie en dépendait', 'La poigne de Hanayama'],
    homeAlt: 'towel_squeeze', painAlt: { epaules: 'towel_squeeze' },
  },
  towel_squeeze: {
    id: 'towel_squeeze', name: 'Essorage de serviette', muscle: 'Avant-bras · Grip', kind: 'reps', equip: ['aucun'],
    cues: ['Serviette mouillée', 'Essore au maximum', 'Alterne le sens'],
  },
  pompe_doigts: {
    id: 'pompe_doigts', name: 'Pompes sur le bout des doigts', muscle: 'Doigts · Pectoraux', kind: 'reps', equip: ['aucun'],
    cues: ['Doigts écartés et arqués', 'Commence sur les genoux', 'Stop si douleur articulaire'],
    painAlt: { poignets: 'pompe_poings' },
  },
};

/* ───────────────────────── PROGRAMMES ───────────────────────── */

const WARMUP_BASE = ['2 min corde ou jumping jacks', 'Rotations épaules & hanches', '10 squats + 10 pompes lentes'];
const WARMUP_FIGHT = ['3 min shadow boxing léger', 'Rotations poignets, chevilles, nuque', '10 fentes + 10 pompes'];
const WARMUP_HEAVY = ['5 min cardio léger', 'Mobilité hanches & thoracique', '2 séries d’approche légères du 1er exercice'];

/** Exercice de programme : séries × fourchette de reps (ou de secondes), repos en secondes */
const x = (id: string, sets: number, reps: number, max: number, rest: number, more: Partial<ProgramExercise> = {}): ProgramExercise => ({ id, sets, reps, max, rest, ...more });
/** Mouvement principal de la séance : priorité, échauffement, progression de charge */
const main = (id: string, sets: number, reps: number, max: number, rest: number, more: Partial<ProgramExercise> = {}) => x(id, sets, reps, max, rest, { main: true, ...more });
const day = (name: string, kanji: string, focus: string, warmup: string[], exercises: ProgramExercise[], finisher?: ProgramDay['finisher']): ProgramDay => ({ name, kanji, focus, warmup, exercises, finisher });

/* — Poids du corps : explosivité — */
const BAKI_HAUT = day('Explosion du Haut', '爆', 'Tirage & poussée explosifs', WARMUP_BASE, [
  main('traction_explosive', 4, 4, 6, 120),
  x('pompe_explosive', 4, 6, 10, 90),
  x('dips', 3, 8, 12, 90),
  x('rowing_inverse', 3, 10, 15, 60),
  x('pompe_archer', 3, 5, 8, 75, { note: 'par côté' }),
  x('hollow_hold', 3, 20, 40, 45),
], { name: 'Pluie de coups', desc: '3 × 30 s de shadow boxing à fond, 15 s de repos' });
const BAKI_COMBAT = day('Corps de Combat', '闘', 'Conditionnement full body', WARMUP_FIGHT, [
  x('burpee', 4, 8, 12, 60),
  main('tractions', 3, 6, 10, 90),
  x('pompe_diamant', 3, 8, 15, 60),
  x('bear_crawl', 3, 30, 45, 45),
  x('mountain_climber', 3, 30, 45, 30),
  x('russian_twist', 3, 20, 30, 30),
]);

/* — Salle : hypertrophie — */
const JACK_PUSH = day('Poussée', '押', 'Pectoraux, épaules, triceps', WARMUP_BASE, [
  main('developpe_couche', 4, 6, 10, 120),
  x('developpe_incline', 3, 8, 12, 90),
  x('developpe_halteres', 3, 8, 12, 90),
  x('elevation_laterale', 4, 12, 20, 45),
  x('dips', 3, 8, 15, 75),
  x('extension_triceps', 3, 10, 15, 60),
]);
const JACK_PULL = day('Tirage', '引', 'Dos & biceps', WARMUP_BASE, [
  main('tractions', 4, 6, 10, 120),
  x('rowing', 4, 8, 12, 90),
  x('rowing_haltere', 3, 10, 12, 75, { note: 'par bras' }),
  x('face_pull', 3, 12, 20, 45),
  x('curl', 3, 10, 15, 60),
  x('curl_marteau', 3, 10, 15, 60),
]);
const JACK_LEGS = day('Jambes', '脚', 'Quadriceps, ischios, fessiers', WARMUP_BASE, [
  main('squat_barre', 4, 6, 10, 150),
  x('souleve_roumain', 3, 8, 12, 120),
  x('presse', 3, 10, 15, 90),
  x('leg_curl', 3, 10, 15, 60),
  x('hip_thrust', 3, 8, 12, 75),
  x('mollets', 4, 12, 20, 45),
]);
const JACK_UPPER_A = day('Haut A', '上', 'Haut du corps — poussée', WARMUP_BASE, [
  main('developpe_couche', 4, 6, 10, 120),
  x('rowing', 4, 8, 12, 90),
  x('developpe_halteres', 3, 8, 12, 90),
  x('tractions', 3, 8, 12, 90),
  x('elevation_laterale', 3, 12, 20, 45),
  x('extension_triceps', 3, 10, 15, 60),
]);
const JACK_LOWER_A = day('Bas A', '下', 'Bas du corps — squat', WARMUP_BASE, [
  main('squat_barre', 4, 6, 10, 150),
  x('souleve_roumain', 3, 8, 12, 120),
  x('presse', 3, 10, 15, 90),
  x('leg_curl', 3, 10, 15, 60),
  x('mollets', 4, 12, 20, 45),
  x('crunch', 3, 12, 20, 45),
]);
const JACK_UPPER_B = day('Haut B', '上', 'Haut du corps — tirage', WARMUP_BASE, [
  main('tractions', 4, 6, 10, 120),
  x('developpe_incline', 4, 8, 12, 90),
  x('rowing_haltere', 3, 10, 12, 75, { note: 'par bras' }),
  x('dips', 3, 8, 15, 75),
  x('face_pull', 3, 12, 20, 45),
  x('curl', 3, 10, 15, 60),
]);
const JACK_LOWER_B = day('Bas B', '下', 'Bas du corps — hanche', WARMUP_BASE, [
  main('souleve_terre', 3, 5, 8, 180),
  x('front_squat', 3, 6, 10, 150),
  x('squat_bulgare', 3, 8, 12, 90, { note: 'par jambe' }),
  x('hip_thrust', 3, 8, 12, 75),
  x('mollets', 4, 12, 20, 45),
  x('leg_raise', 3, 10, 15, 45),
]);

/* — Maison : volume au poids du corps — */
const OLIVA_TORSE = day('Poussée', '押', 'Pectoraux, épaules, triceps', WARMUP_BASE, [
  main('pompe', 5, 15, 25, 60),
  x('pompe_declinee', 4, 10, 15, 60),
  x('dips', 4, 10, 15, 75),
  x('pompe_diamant', 3, 10, 20, 60),
  x('pompe_pike', 3, 8, 12, 75),
  x('gainage', 3, 45, 75, 45),
], { name: 'Le Mur', desc: '5 min : maximum de pompes. Note ton score.' });
const OLIVA_DOS = day('Tirage', '引', 'Dos & biceps', WARMUP_BASE, [
  main('tractions', 5, 6, 10, 90),
  x('rowing_inverse', 5, 10, 15, 60),
  x('chin_up', 4, 6, 10, 75),
  x('y_raise', 3, 12, 15, 30),
  x('chin_up_iso', 3, 20, 40, 45),
  x('hollow_hold', 3, 20, 40, 30),
]);
const OLIVA_JAMBES = day('Jambes', '脚', 'Quadriceps, fessiers, mollets', WARMUP_BASE, [
  main('squat_bulgare', 5, 10, 15, 75, { note: 'par jambe' }),
  x('squat_saute', 4, 10, 20, 60),
  x('pont_fessier', 4, 15, 25, 45),
  x('souleve_une_jambe', 3, 10, 15, 60, { note: 'par jambe' }),
  x('chaise', 3, 45, 90, 45),
  x('mollets', 5, 20, 30, 30),
]);
const OLIVA_BRAS = day('Bras', '腕', 'Bras & avant-bras', WARMUP_BASE, [
  main('dips', 4, 10, 15, 75),
  x('chin_up', 4, 6, 10, 75),
  x('pompe_diamant', 4, 10, 20, 60),
  x('chin_up_iso', 3, 20, 40, 45),
  x('pompe_archer', 3, 5, 8, 60, { note: 'par côté' }),
  x('farmer_hold_home', 3, 30, 60, 45),
]);

/* — Salle : sèche (force + conditionnement) — */
const SECHE_A = day('Full body A', '一', 'Force & dépense', WARMUP_HEAVY, [
  main('squat_barre', 4, 6, 10, 120),
  x('developpe_couche', 3, 8, 12, 90),
  x('rowing', 3, 8, 12, 90),
  x('souleve_roumain', 3, 8, 12, 90),
  x('gainage', 3, 30, 60, 45),
], { name: 'Brûleur', desc: '8 × 20 s de burpees, 10 s de repos' });
const SECHE_B = day('Full body B', '二', 'Force & dépense', WARMUP_HEAVY, [
  main('souleve_terre', 3, 5, 8, 150),
  x('developpe', 3, 8, 12, 90),
  x('tractions', 3, 6, 10, 90),
  x('squat_bulgare', 3, 10, 12, 75, { note: 'par jambe' }),
  x('kb_swing', 3, 15, 20, 60),
], { name: 'Brûleur', desc: '5 min : 10 swings + 10 mountain climbers par minute' });
const SECHE_C = day('Conditionnement', '燃', 'Circuit cardio-musculaire', WARMUP_FIGHT, [
  main('farmer_walk', 4, 30, 45, 75),
  x('burpee', 4, 8, 12, 60),
  x('kb_swing', 4, 15, 20, 60),
  x('mountain_climber', 3, 30, 45, 30),
  x('bear_crawl', 3, 30, 45, 45),
  x('russian_twist', 3, 20, 30, 30),
]);
const SECHE_HIIT = day('HIIT', '速', 'Intervalles', WARMUP_FIGHT, [
  main('sprint', 8, 15, 20, 45),
  x('burpee', 3, 10, 15, 60),
  x('corde', 3, 60, 90, 30),
  x('mountain_climber', 3, 30, 45, 30),
]);

/* — Salle : forme générale — */
const FORME_A = day('Full body A', '一', 'Tout le corps', WARMUP_BASE, [
  main('squat_barre', 3, 8, 12, 120),
  x('developpe_halteres', 3, 8, 12, 90),
  x('rowing_haltere', 3, 10, 12, 75, { note: 'par bras' }),
  x('hip_thrust', 3, 10, 12, 75),
  x('gainage', 3, 30, 60, 45),
]);
const FORME_B = day('Full body B', '二', 'Tout le corps', WARMUP_BASE, [
  main('souleve_roumain', 3, 8, 12, 120),
  x('developpe_couche', 3, 8, 12, 90),
  x('tractions', 3, 6, 10, 90),
  x('squat_bulgare', 3, 8, 12, 75, { note: 'par jambe' }),
  x('face_pull', 3, 12, 15, 45),
  x('leg_raise', 3, 8, 15, 45),
]);
const FORME_C = day('Full body C', '三', 'Tout le corps', WARMUP_BASE, [
  main('presse', 3, 10, 15, 90),
  x('developpe_incline', 3, 10, 12, 90),
  x('rowing', 3, 10, 12, 90),
  x('elevation_laterale', 3, 12, 15, 45),
  x('mollets', 3, 12, 20, 45),
  x('crunch', 3, 12, 20, 45),
]);
const CARDIO = day('Cardio & gainage', '息', 'Endurance', WARMUP_FIGHT, [
  main('corde', 5, 60, 90, 30),
  x('shadow_boxing', 4, 60, 90, 30),
  x('mountain_climber', 3, 30, 45, 30),
  x('gainage_lateral', 3, 20, 40, 30, { note: 'par côté' }),
  x('hollow_hold', 3, 20, 40, 30),
]);

type Template = Pick<Program, 'days2' | 'days3' | 'days' | 'extra'>;

const TEMPLATES: Record<'muscle' | 'seche' | 'forme' | 'maison', Template> = {
  muscle: {
    days2: [
      day('Haut du corps', '上', 'Haut du corps complet', WARMUP_BASE, [
        main('developpe_couche', 4, 6, 10, 120),
        x('tractions', 4, 6, 10, 120),
        x('developpe_halteres', 3, 8, 12, 90),
        x('rowing_haltere', 3, 8, 12, 75, { note: 'par bras' }),
        x('elevation_laterale', 3, 12, 20, 45),
        x('curl', 2, 10, 15, 45),
        x('extension_triceps', 2, 10, 15, 45),
      ]),
      day('Bas du corps', '下', 'Bas du corps complet', WARMUP_BASE, [
        main('squat_barre', 4, 6, 10, 150),
        x('souleve_roumain', 3, 8, 12, 120),
        x('presse', 3, 10, 15, 90),
        x('leg_curl', 3, 10, 15, 60),
        x('mollets', 4, 12, 20, 45),
        x('crunch', 3, 12, 20, 45),
      ]),
    ],
    days3: [JACK_PUSH, JACK_PULL, JACK_LEGS],
    days: [JACK_UPPER_A, JACK_LOWER_A, JACK_UPPER_B, JACK_LOWER_B],
    extra: day('Épaules & bras', '腕', 'Points faibles', WARMUP_BASE, [
      main('developpe', 4, 6, 10, 120),
      x('elevation_laterale', 4, 12, 20, 45),
      x('face_pull', 3, 12, 20, 45),
      x('shrug', 3, 10, 15, 60),
      x('curl', 3, 10, 15, 45),
      x('extension_triceps', 3, 10, 15, 45),
    ]),
  },
  seche: {
    days2: [SECHE_A, SECHE_B],
    days3: [SECHE_A, SECHE_B, SECHE_C],
    days: [JACK_UPPER_A, JACK_LOWER_A, SECHE_C, JACK_LOWER_B],
    extra: SECHE_HIIT,
  },
  forme: {
    days2: [FORME_A, FORME_B],
    days3: [FORME_A, FORME_B, FORME_C],
    days: [FORME_A, FORME_B, CARDIO, FORME_C],
    extra: CARDIO,
  },
  maison: {
    days2: [
      day('Haut du corps', '上', 'Poussée & tirage', WARMUP_BASE, [
        main('pompe', 5, 12, 25, 60),
        x('tractions', 4, 5, 10, 90),
        x('dips', 4, 8, 15, 75),
        x('rowing_inverse', 4, 10, 15, 60),
        x('pompe_pike', 3, 6, 12, 75),
        x('hollow_hold', 3, 20, 40, 30),
      ]),
      day('Bas du corps', '下', 'Jambes & abdos', WARMUP_BASE, [
        main('squat_bulgare', 4, 8, 15, 75, { note: 'par jambe' }),
        x('squat_saute', 3, 8, 15, 60),
        x('pont_fessier', 4, 15, 25, 45),
        x('souleve_une_jambe', 3, 10, 15, 60, { note: 'par jambe' }),
        x('mollets', 4, 15, 30, 30),
        x('leg_raise', 3, 10, 15, 45),
      ]),
    ],
    days3: [OLIVA_TORSE, OLIVA_DOS, OLIVA_JAMBES],
    days: [BAKI_HAUT, OLIVA_JAMBES, OLIVA_DOS, BAKI_COMBAT],
    extra: OLIVA_BRAS,
  },
};

const GOAL_LABEL: Record<NonNullable<SessionProfile['goal']>, string> = {
  prendre_muscle: 'Prise de muscle',
  recomposition: 'Recomposition',
  maigrir: 'Perte de gras',
  forme: 'Forme & santé',
};

export interface PlanInput {
  goal?: SessionProfile['goal'];
  location?: SessionProfile['location'];
  frequency?: number | null;
}

/** Programme personnalisé : construit d'après l'objectif, le lieu et la fréquence */
export function buildPlan({ goal, location, frequency }: PlanInput = {}): Program {
  const key = location === 'maison' ? 'maison' : goal === 'maigrir' ? 'seche' : goal === 'forme' ? 'forme' : 'muscle';
  const f = Math.max(1, Math.min(6, frequency ?? 3));
  return {
    id: PLAN_ID,
    title: 'Ton programme',
    tagline: [goal ? GOAL_LABEL[goal] : 'Programme complet', `${f} séance${f > 1 ? 's' : ''} / semaine`, location === 'maison' ? 'Maison' : 'Salle'].join(' · '),
    ...TEMPLATES[key],
  };
}

/* ───────────────────────── PERSONNALISATION ───────────────────────── */

/** Séances de la semaine selon la fréquence choisie (rotation dans cet ordre) */
export function scheduleFor(program: Program, frequency?: number | null): ProgramDay[] {
  const f = frequency ?? 3;
  if (f <= 2) return program.days2;
  if (f === 3) return program.days3;
  if (f === 4) return program.days;
  return [...program.days, program.extra];
}

export interface BlockWeek {
  /** semaine du bloc, de 1 à 4 */
  week: 1 | 2 | 3 | 4;
  /** nombre de blocs de 4 semaines déjà terminés */
  cycle: number;
  label: string;
  /** répétitions à garder en réserve en fin de série */
  rir: number;
  hint: string;
}

const WEEKS: Omit<BlockWeek, 'cycle'>[] = [
  { week: 1, label: 'Fondation', rir: 3, hint: 'Bas de la fourchette, technique parfaite. Garde 3 reps en réserve.' },
  { week: 2, label: 'Volume', rir: 2, hint: 'Une série de plus sur les gros mouvements. Garde 2 reps en réserve.' },
  { week: 3, label: 'Intensité', rir: 1, hint: 'Haut de la fourchette, charge maximale propre. Garde 1 rep en réserve.' },
  { week: 4, label: 'Récupération', rir: 4, hint: 'Semaine allégée : moins de séries, le corps se reconstruit.' },
];

/** Semaine du bloc de 4 semaines, d'après le nombre de séances faites et la fréquence */
export function blockWeek(sessionsDone: number, frequency?: number | null): BlockWeek {
  const perWeek = Math.max(1, Math.min(6, frequency ?? 3));
  const weeksDone = Math.floor(Math.max(0, sessionsDone) / perWeek);
  return { ...WEEKS[weeksDone % 4], cycle: Math.floor(weeksDone / 4) };
}

export interface SessionProfile {
  location?: 'salle' | 'maison' | null;
  douleurs?: Douleur[] | null;
  experience?: 'debutant' | 'intermediaire' | 'avance' | null;
  resilience?: 'debutant' | 'guerrier' | 'monstre' | 'demon' | null;
  goal?: 'maigrir' | 'prendre_muscle' | 'recomposition' | 'forme' | null;
  /** séances par semaine (choisit la version du programme) */
  frequency?: number | null;
  /** séances déjà faites dans ce programme (fait avancer le bloc de 4 semaines) */
  sessionsDone?: number;
  /** Multiplicateur d'intensité choisi par l'utilisateur (0.8 / 1 / 1.2) */
  intensity?: number;
}

export interface SessionExercise {
  id: string;
  originalId: string;
  name: string;
  muscle: string;
  kind: 'reps' | 'sec';
  sets: number;
  /** objectif de la séance (reps ou secondes) */
  reps: number;
  /** haut de la fourchette */
  repsMax: number;
  rest: number;
  rir: number;
  cues: string[];
  note?: string;
  weighted: boolean;
  main: boolean;
  swapped: boolean;
}

/** Résout l'exercice selon douleurs puis lieu (max 4 substitutions pour éviter les boucles). */
export function resolveExerciseId(id: string, profile: SessionProfile): string {
  let current = id;
  for (let i = 0; i < 4; i++) {
    const ex = EXERCISES[current];
    if (!ex) return current;
    const pain = (profile.douleurs ?? []).find((d) => ex.painAlt?.[d]);
    if (pain) {
      current = ex.painAlt![pain]!;
      continue;
    }
    if (profile.location === 'maison' && !ex.equip.includes('aucun') && ex.homeAlt) {
      current = ex.homeAlt;
      continue;
    }
    return current;
  }
  return current;
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export function buildSession(program: Program, dayIndex: number, profile: SessionProfile = {}): SessionExercise[] {
  const days = scheduleFor(program, profile.frequency);
  const day = days[((dayIndex % days.length) + days.length) % days.length];
  if (!day) return [];
  const bw = blockWeek(profile.sessionsDone ?? 0, profile.frequency);
  const setDelta = (profile.experience === 'debutant' ? -1 : profile.experience === 'avance' ? 1 : 0) + (profile.goal === 'forme' ? -1 : 0);
  const restMult =
    (profile.resilience === 'demon' ? 0.75 : profile.resilience === 'monstre' ? 0.85 : profile.resilience === 'debutant' ? 1.15 : 1) *
    (profile.goal === 'maigrir' ? 0.8 : profile.goal === 'recomposition' ? 0.9 : 1);
  const levelMult = (profile.experience === 'debutant' ? 0.8 : profile.experience === 'avance' ? 1.1 : 1) * (profile.intensity ?? 1);

  return day.exercises
    .map((pe, i): SessionExercise | null => {
      const resolvedId = resolveExerciseId(pe.id, profile);
      const ex = EXERCISES[resolvedId];
      if (!ex) return null;
      const weighted = !!ex.weighted && profile.location !== 'maison';
      const sec = ex.kind === 'sec';
      const step = sec ? 5 : 1;

      // fourchette : avec charge, la charge progresse et la fourchette reste ; au poids du corps, les reps montent à chaque bloc
      const grow = weighted ? 1 : levelMult * (1 + 0.08 * Math.min(bw.cycle, 4));
      const lo = Math.max(sec ? 10 : 3, roundTo(pe.reps * grow, step));
      const hi = Math.max(lo, roundTo((pe.max ?? pe.reps) * grow, step));
      const target = bw.week === 3 ? hi : bw.week === 2 ? roundTo((lo + hi) / 2, step) : lo;

      let sets = pe.sets + setDelta;
      if (bw.week === 2 && (pe.main || i < 2)) sets += 1;
      if (bw.week === 4) sets = Math.round(sets * 0.6);
      sets = Math.max(2, Math.min(6, sets));

      const strength = weighted && hi <= 6;
      const notes = [pe.note, pe.main && weighted && bw.week !== 4 ? '2 séries d’échauffement avant' : undefined].filter(Boolean);
      return {
        id: ex.id,
        originalId: pe.id,
        name: ex.name,
        muscle: ex.muscle,
        kind: ex.kind,
        sets,
        reps: target,
        repsMax: hi,
        rest: Math.max(20, roundTo(pe.rest * restMult, 5)),
        rir: strength ? Math.max(1, bw.rir) : bw.rir,
        cues: ex.cues,
        note: notes.length ? notes.join(' · ') : undefined,
        weighted,
        main: !!pe.main,
        swapped: ex.id !== pe.id,
      };
    })
    .filter((x): x is SessionExercise => x !== null);
}

/**
 * Charge conseillée (double progression) : si toutes les séries de la dernière fois
 * ont atteint le haut de la fourchette, on ajoute 2,5 kg (1 kg sous 10 kg).
 */
export function suggestWeight(last: { reps: number; weight?: number }[] | undefined, repsMax: number): number | undefined {
  const w = last?.map((s) => s.weight ?? 0).filter((v) => v > 0) ?? [];
  if (!w.length) return undefined;
  const top = Math.max(...w);
  const allHit = last!.every((s) => s.reps >= repsMax);
  return allHit ? top + (top < 10 ? 1 : 2.5) : top;
}

/** Durée estimée d'une séance en minutes (≈3 s par rep, temps tenus, repos, échauffement). */
export function estimateMinutes(exercises: SessionExercise[]): number {
  let sec = 6 * 60;
  for (const e of exercises) {
    const work = e.kind === 'sec' ? e.reps : e.reps * 3;
    sec += e.sets * work + (e.sets - 1) * e.rest + 45;
  }
  return Math.round(sec / 60);
}

/** XP gagnée pour une séance selon le volume réalisé. */
export function sessionXp(setsDone: number, totalSets: number): number {
  const ratio = totalSets > 0 ? setsDone / totalSets : 0;
  return Math.round(76 * (0.4 + 0.6 * ratio));
}
