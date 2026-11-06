export type Douleurs = Array<'dos' | 'genoux' | 'epaules' | 'poignets' | 'autre'> | null;
export type ShonenArchetype = 'baki' | 'yujiro' | 'jack' | 'doppo';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: string;
  /** 'reps' par défaut, 'sec' pour gainage/planche/isométrie */
  unit?: 'reps' | 'sec';
  imageUrl?: string;
}

const DOULEURS_REMPLACEMENTS: Record<
  'dos' | 'genoux' | 'epaules' | 'poignets' | 'autre',
  Record<string, string>
> = {
  genoux: {
    squat_barre: 'presse',
  },
  dos: {
    souleve_terre: 'hip_thrust',
  },
  epaules: {},
  poignets: {},
  autre: {},
};

const HOUSE_REPLACEMENTS: Record<string, string> = {
  squat_barre: 'squat_saute',
  presse: 'squat_statique',
  souleve_terre: 'gainage',
  rowing: 'tractions',
  developpe: 'pompe_poings',
  dips_lestes: 'dips',
  traction_lestee: 'tractions',
  leg_curl: 'squat_statique',
  hip_thrust: 'crunch',
};

function applyLocationReplacement(ids: string[], location: string | null): string[] {
  if (location !== 'maison') return ids;
  return ids.map((id) => HOUSE_REPLACEMENTS[id] ?? id);
}

function applyDouleurs(ids: string[], douleurs: Douleurs): string[] {
  if (!douleurs?.length) return ids;
  const ordered: NonNullable<Douleurs>[number][] = [
    'genoux',
    'dos',
    'epaules',
    'poignets',
    'autre',
  ];
  const active = ordered.filter((d) => douleurs.includes(d));

  const merged: Record<string, string> = {};
  for (const d of active) {
    const map = DOULEURS_REMPLACEMENTS[d] ?? {};
    for (const k of Object.keys(map)) {
      if (!(k in merged)) merged[k] = map[k];
    }
  }
  return ids.map((id) => merged[id] ?? id);
}

const EXERCISE_BANK: Record<string, Exercise> = {
  squat_barre: {
    id: 'squat_barre',
    name: 'Squat barre',
    muscle: 'Quadriceps / Fessiers',
    sets: 4,
    reps: 8,
    rest: '2 min',
  },
  presse: {
    id: 'presse',
    name: 'Presse à cuisses',
    muscle: 'Quadriceps / Fessiers',
    sets: 4,
    reps: 12,
    rest: '90 s',
  },
  souleve_terre: {
    id: 'souleve_terre',
    name: 'Soulevé de terre',
    muscle: 'Dos / Ischios',
    sets: 3,
    reps: 5,
    rest: '3 min',
  },
  hip_thrust: {
    id: 'hip_thrust',
    name: 'Hip thrust',
    muscle: 'Fessiers',
    sets: 4,
    reps: 10,
    rest: '2 min',
  },
  pompe: {
    id: 'pompe',
    name: 'Pompes',
    muscle: 'Pectoraux / Triceps',
    sets: 4,
    reps: 12,
    rest: '90 s',
  },
  tractions: {
    id: 'tractions',
    name: 'Tractions',
    muscle: 'Dos / Biceps',
    sets: 4,
    reps: 8,
    rest: '2 min',
  },
  rowing: {
    id: 'rowing',
    name: 'Rowing barre ou haltères',
    muscle: 'Dos',
    sets: 4,
    reps: 10,
    rest: '90 s',
  },
  curl: {
    id: 'curl',
    name: 'Curl biceps',
    muscle: 'Biceps',
    sets: 3,
    reps: 12,
    rest: '60 s',
  },
  dips: {
    id: 'dips',
    name: 'Dips',
    muscle: 'Triceps / Pectoraux',
    sets: 3,
    reps: 10,
    rest: '90 s',
  },
  leg_curl: {
    id: 'leg_curl',
    name: 'Leg curl',
    muscle: 'Ischio-jambiers',
    sets: 4,
    reps: 12,
    rest: '90 s',
  },
  crunch: {
    id: 'crunch',
    name: 'Crunch abdos',
    muscle: 'Abdominaux',
    sets: 3,
    reps: 15,
    rest: '45 s',
  },
  gainage: {
    id: 'gainage',
    name: 'Gainage',
    muscle: 'Core',
    sets: 3,
    reps: 45,
    rest: '60 s',
    unit: 'sec',
  },
  developpe: {
    id: 'developpe',
    name: 'Développé militaire',
    muscle: 'Épaules',
    sets: 4,
    reps: 10,
    rest: '90 s',
  },
  pompe_explosive: {
    id: 'pompe_explosive',
    name: 'Pompes claquées explosives',
    muscle: 'Pectoraux / Explosivité',
    sets: 4,
    reps: 10,
    rest: '60 s',
  },
  squat_saute: {
    id: 'squat_saute',
    name: 'Squats sautés explosifs',
    muscle: 'Quadriceps / Puissance',
    sets: 4,
    reps: 15,
    rest: '60 s',
  },
  pompe_poings: {
    id: 'pompe_poings',
    name: 'Pompes sur les poings (Seiken)',
    muscle: 'Pectoraux / Poignets / Gainage',
    sets: 4,
    reps: 12,
    rest: '75 s',
  },
  squat_statique: {
    id: 'squat_statique',
    name: 'Posture du Cavalier (Kiba Dachi)',
    muscle: 'Quadriceps / Mental / Endurance',
    sets: 3,
    reps: 60,
    rest: '60 s',
    unit: 'sec',
  },
  traction_lestee: {
    id: 'traction_lestee',
    name: 'Tractions lestées (Dos du Démon)',
    muscle: 'Dos / Biceps',
    sets: 4,
    reps: 6,
    rest: '120 s',
  },
  dips_lestes: {
    id: 'dips_lestes',
    name: 'Dips lestés',
    muscle: 'Triceps / Pectoraux',
    sets: 4,
    reps: 6,
    rest: '120 s',
  },
};

const PROGRAM_TEMPLATE: Record<
  'perte' | 'prise',
  Record<number, string[]>
> = {
  perte: {
    1: ['pompe', 'squat_barre', 'tractions', 'crunch'],
    2: ['presse', 'hip_thrust', 'leg_curl', 'gainage'],
    3: ['rowing', 'developpe', 'dips', 'crunch'],
    4: ['squat_barre', 'tractions', 'pompe', 'gainage'],
    5: ['presse', 'hip_thrust', 'curl', 'crunch'],
  },
  prise: {
    1: ['squat_barre', 'souleve_terre', 'rowing', 'crunch'],
    2: ['pompe', 'developpe', 'dips', 'gainage'],
    3: ['presse', 'hip_thrust', 'leg_curl', 'crunch'],
    4: ['tractions', 'curl', 'pompe', 'gainage'],
    5: ['squat_barre', 'hip_thrust', 'rowing', 'crunch'],
  },
};

const SHONEN_PROGRAM_TEMPLATE: Record<
  ShonenArchetype,
  Record<number, string[]>
> = {
  baki: {
    1: ['tractions', 'pompe_explosive', 'squat_saute', 'crunch'],
    2: ['gainage', 'squat_saute', 'pompe_explosive', 'tractions'],
    3: ['dips', 'rowing', 'crunch', 'gainage'],
    4: ['pompe_explosive', 'tractions', 'squat_saute', 'crunch'],
    5: ['gainage', 'dips', 'rowing', 'crunch'],
  },
  yujiro: {
    1: ['souleve_terre', 'developpe', 'squat_barre', 'dips_lestes'],
    2: ['souleve_terre', 'squat_barre', 'traction_lestee', 'gainage'],
    3: ['developpe', 'dips_lestes', 'rowing', 'crunch'],
    4: ['souleve_terre', 'squat_barre', 'traction_lestee', 'developpe'],
    5: ['dips_lestes', 'rowing', 'squat_barre', 'gainage'],
  },
  jack: {
    1: ['presse', 'rowing', 'curl', 'dips', 'leg_curl'],
    2: ['squat_barre', 'hip_thrust', 'leg_curl', 'gainage', 'curl'],
    3: ['rowing', 'developpe', 'dips', 'curl', 'crunch'],
    4: ['presse', 'hip_thrust', 'rowing', 'dips', 'gainage'],
    5: ['squat_barre', 'leg_curl', 'curl', 'dips', 'crunch'],
  },
  doppo: {
    1: ['pompe_poings', 'developpe', 'squat_statique', 'gainage'],
    2: ['pompe_poings', 'squat_statique', 'gainage', 'tractions'],
    3: ['developpe', 'rowing', 'pompe_poings', 'crunch'],
    4: ['pompe_poings', 'squat_statique', 'gainage', 'crunch'],
    5: ['developpe', 'rowing', 'squat_statique', 'gainage'],
  },
};

/** Repas suggeres pour auto-completion rapide (prototype) */
export const REPAS_SUGGESTIONS = [
  { label: 'Poulet roti + riz + legumes', calories: 520, protein: 45, carbs: 42, fat: 15, portionG: 350 },
  { label: 'Steak hache + patates douces + salade', calories: 580, protein: 38, carbs: 48, fat: 22 },
  { label: 'Bowl poke saumon', calories: 650, protein: 35, carbs: 55, fat: 28 },
  { label: 'Oeufs brouilles + avocat + pain complet', calories: 420, protein: 22, carbs: 28, fat: 24 },
  { label: 'Pates complete + boeuf + parmesan', calories: 720, protein: 42, carbs: 68, fat: 32 },
  { label: 'Salade cesar poulet', calories: 380, protein: 32, carbs: 12, fat: 22 },
  { label: 'Saumon grille + quinoa + brocolis', calories: 540, protein: 40, carbs: 38, fat: 24 },
  { label: 'Cottage cheese + fruits + noix', calories: 280, protein: 28, carbs: 22, fat: 10 },
  { label: 'Shake proteine + banane', calories: 320, protein: 35, carbs: 38, fat: 4 },
  { label: 'Omelette 3 oeufs + fromage', calories: 380, protein: 28, carbs: 4, fat: 28 },
];

/** Repas demo pour seed journee type */
export const REPAS_DEMO: Array<{ type: 'petit_dej' | 'dej' | 'diner' | 'snack'; label: string; calories: number; protein?: number; carbs?: number; fat?: number }> = [
  { type: 'petit_dej', label: 'Oeufs brouilles + avocat', calories: 380, protein: 22, carbs: 12, fat: 28 },
  { type: 'dej', label: 'Poulet roti + riz + legumes', calories: 520, protein: 45, carbs: 42, fat: 15 },
  { type: 'diner', label: 'Steak hache + patates douces', calories: 580, protein: 38, carbs: 48, fat: 22 },
  { type: 'snack', label: 'Shake proteine', calories: 120, protein: 25, carbs: 3, fat: 1 },
];

export function getExercisesForDay(options: {
  objectif: 'perte' | 'prise';
  day: number;
  douleurs?: Douleurs;
  shonenArchetype?: ShonenArchetype | null;
  trainingLocation?: 'salle' | 'maison' | null;
}): Exercise[] {
  const { objectif, day, douleurs = null, shonenArchetype = null, trainingLocation = null } = options;
  let baseIds: string[] = [];
  
  if (shonenArchetype && SHONEN_PROGRAM_TEMPLATE[shonenArchetype]) {
    baseIds = SHONEN_PROGRAM_TEMPLATE[shonenArchetype][day] ?? [];
  } else {
    baseIds = PROGRAM_TEMPLATE[objectif][day] ?? [];
  }
  
  let adjustedIds = applyDouleurs(baseIds, douleurs);
  adjustedIds = applyLocationReplacement(adjustedIds, trainingLocation);
  
  return adjustedIds
    .map((id) => EXERCISE_BANK[id])
    .filter(Boolean) as Exercise[];
}

