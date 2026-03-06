export type Douleurs = Array<'dos' | 'genoux' | 'epaules' | 'poignets' | 'autre'> | null;

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: string;
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
};

const PROGRAM_TEMPLATE: Record<
  'perte' | 'prise',
  Record<number, string[]>
> = {
  perte: {
    1: ['pompe', 'squat_barre', 'tractions'],
    2: ['presse', 'hip_thrust'],
    3: ['pompe', 'tractions'],
    4: ['squat_barre', 'hip_thrust'],
  },
  prise: {
    1: ['pompe', 'souleve_terre'],
    2: ['squat_barre', 'tractions'],
    3: ['presse', 'hip_thrust'],
    4: ['pompe', 'tractions'],
  },
};

export function getExercisesForDay(options: {
  objectif: 'perte' | 'prise';
  day: number;
  douleurs?: Douleurs;
}): Exercise[] {
  const { objectif, day, douleurs = null } = options;
  const baseIds = PROGRAM_TEMPLATE[objectif][day] ?? [];
  const adjustedIds = applyDouleurs(baseIds, douleurs);
  return adjustedIds
    .map((id) => EXERCISE_BANK[id])
    .filter(Boolean) as Exercise[];
}

