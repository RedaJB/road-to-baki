/** Utilitaires streak (jours consécutifs calendaires, ISO YYYY-MM-DD) */

/** Date locale (pas UTC) au format YYYY-MM-DD */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toLocalISO(d);
}

export function todayISO(): string {
  return toLocalISO(new Date());
}

/**
 * Compte les jours consécutifs en remontant depuis une ancre.
 * Si aujourd'hui n'est pas complet, on peut quand même prolonger la série depuis hier (style Duolingo).
 */
export function computeRollingStreak(
  isComplete: (date: string) => boolean,
  today: string,
): number {
  let anchor = today;
  if (!isComplete(today)) {
    const yesterday = addDaysISO(today, -1);
    if (isComplete(yesterday)) anchor = yesterday;
    else return 0;
  }
  let count = 0;
  let d = anchor;
  while (isComplete(d)) {
    count++;
    d = addDaysISO(d, -1);
  }
  return count;
}

export function computeTrainingStreak(trainingDates: readonly string[], today: string): number {
  const set = new Set(trainingDates);
  return computeRollingStreak((d) => set.has(d), today);
}

export type WarriorDayCheck = {
  foodOk: boolean;
  waterOk: boolean;
  moveOk: boolean;
  complete: boolean;
};

export function checkWarriorDay(params: {
  date: string;
  totalKcal: number;
  calorieGoal: number;
  waterMl: number;
  waterGoalMl: number;
  trainingDone: boolean;
  steps: number;
  stepsTarget?: number;
}): WarriorDayCheck {
  const {
    totalKcal,
    calorieGoal,
    waterMl,
    waterGoalMl,
    trainingDone,
    steps,
    stepsTarget = 10000,
  } = params;
  const safeGoal = Math.max(1, calorieGoal);
  const foodOk = totalKcal >= safeGoal * 0.35;
  const waterOk = waterGoalMl > 0 && waterMl >= waterGoalMl * 0.9;
  const moveOk = trainingDone || steps >= Math.min(stepsTarget, Math.round(stepsTarget * 0.65));
  return {
    foodOk,
    waterOk,
    moveOk,
    complete: foodOk && waterOk && moveOk,
  };
}
