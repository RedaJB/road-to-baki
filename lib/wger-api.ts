/**
 * Client pour l'API wger (https://github.com/wger-project/wger)
 * Doc: https://wger.readthedocs.io/en/latest/api/api.html
 * Permet de récupérer des exercices depuis la base wger (877+ exercices).
 */

const WGER_BASE = 'https://wger.de/api/v2';

export interface WgerExercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: string;
}

interface WgerExerciseInfoResult {
  id: number;
  category: { id: number; name: string };
  muscles: Array<{ id: number; name: string; name_en?: string }>;
  muscles_secondary: Array<{ id: number; name: string; name_en?: string }>;
  equipment: Array<{ id: number; name: string }>;
  translations: Array<{ language: number; name: string }>;
}

function mapWgerToOur(e: WgerExerciseInfoResult): WgerExercise {
  const name = e.translations?.[0]?.name || e.category?.name || 'Exercice';
  const muscles = [...(e.muscles || []), ...(e.muscles_secondary || [])];
  const muscleStr = muscles.map((m) => m.name_en || m.name).filter(Boolean).slice(0, 3).join(' / ') || e.category?.name || '—';
  return {
    id: `wger-${e.id}`,
    name: name.slice(0, 80),
    muscle: muscleStr,
    sets: 3,
    reps: 10,
    rest: '90 s',
  };
}

/**
 * Récupère une page d'exercices depuis l'API wger (langue 2 = anglais par défaut).
 * Pas d'authentification requise pour la lecture.
 */
export async function fetchWgerExercises(options: {
  limit?: number;
  offset?: number;
  language?: number;
}): Promise<WgerExercise[]> {
  const { limit = 20, offset = 0, language = 2 } = options;
  const url = `${WGER_BASE}/exerciseinfo/?format=json&limit=${limit}&offset=${offset}&language=${language}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const results: WgerExerciseInfoResult[] = data?.results ?? [];
    return results.map(mapWgerToOur);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}
